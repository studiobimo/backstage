import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import app from './index'

const TEAM_DOMAIN = 'https://studio.cloudflareaccess.com'
const AUDIENCE = 'aud-tag'
const KEY_ID = 'key-1'
const ALGORITHM = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

const base64Url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

const generateKeyPair = () =>
  crypto.subtle.generateKey(
    { ...ALGORITHM, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>

const signToken = async (privateKey: CryptoKey, claims: Record<string, unknown>, kid = KEY_ID) => {
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: TEAM_DOMAIN, aud: [AUDIENCE], iat: now, exp: now + 300, ...claims }
  const signingInput = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }))}.${base64Url(JSON.stringify(payload))}`
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    privateKey,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${base64Url(signature)}`
}

const deployedEnv = { ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, ACCESS_AUD: AUDIENCE } as Env

const request = (
  token?: string,
  env: Partial<Env> = deployedEnv,
  url = 'https://admin.example.com/api/v1/blocks'
) => app.request(url, token ? { headers: { 'Cf-Access-Jwt-Assertion': token } } : {}, env)

let trusted: CryptoKeyPair
let stranger: CryptoKeyPair
let certsRequests: string[]

beforeAll(async () => {
  trusted = await generateKeyPair()
  stranger = await generateKeyPair()
})

const serveCerts = async () => {
  certsRequests = []
  const publicJwk = await crypto.subtle.exportKey('jwk', trusted.publicKey)
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    certsRequests.push(String(input))
    return Response.json({ keys: [{ ...publicJwk, kid: KEY_ID, alg: 'RS256' }] })
  })
}

describe('access verification', () => {
  it('refuses a request with no token', async () => {
    await serveCerts()
    const response = await request()
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden', code: 'forbidden' })
  })

  it('refuses a token that is not a JWT', async () => {
    await serveCerts()
    expect((await request('not-a-jwt')).status).toBe(403)
  })

  it('refuses a token signed with a key Access did not publish', async () => {
    await serveCerts()
    expect((await request(await signToken(stranger.privateKey, {}))).status).toBe(403)
  })

  it('refuses a token naming an unknown key', async () => {
    await serveCerts()
    expect((await request(await signToken(trusted.privateKey, {}, 'other-key'))).status).toBe(403)
  })

  it('refuses an expired token', async () => {
    await serveCerts()
    const past = Math.floor(Date.now() / 1000) - 600
    expect(
      (await request(await signToken(trusted.privateKey, { iat: past - 300, exp: past }))).status
    ).toBe(403)
  })

  it('refuses a token for another audience', async () => {
    await serveCerts()
    expect((await request(await signToken(trusted.privateKey, { aud: ['other'] }))).status).toBe(
      403
    )
  })

  it('refuses a token from another issuer', async () => {
    await serveCerts()
    const token = await signToken(trusted.privateKey, { iss: 'https://evil.cloudflareaccess.com' })
    expect((await request(token)).status).toBe(403)
  })

  it('refuses everything when the team domain or audience is not configured', async () => {
    await serveCerts()
    const token = await signToken(trusted.privateKey, {})
    expect((await request(token, { ACCESS_AUD: AUDIENCE } as Env)).status).toBe(403)
    expect((await request(token, { ACCESS_TEAM_DOMAIN: TEAM_DOMAIN } as Env)).status).toBe(403)
  })

  it('refuses unknown paths too, before they can answer 404', async () => {
    await serveCerts()
    const response = await app.request('/api/nothing-here', {}, deployedEnv)
    expect(response.status).toBe(403)
  })

  it('lets a valid token through, reading the keys from the team domain', async () => {
    await serveCerts()
    const response = await request(await signToken(trusted.privateKey, {}))
    expect(response.status).toBe(200)
    expect(certsRequests).toEqual([`${TEAM_DOMAIN}/cdn-cgi/access/certs`])
  })

  it('accepts a team domain written with a trailing slash', async () => {
    await serveCerts()
    const env = { ...deployedEnv, ACCESS_TEAM_DOMAIN: `${TEAM_DOMAIN}/` } as Env
    expect((await request(await signToken(trusted.privateKey, {}), env)).status).toBe(200)
  })
})

describe('DEV_AUTH', () => {
  const devEnv = { DEV_AUTH: 'true' } as Env

  it.each([
    'http://localhost:5173/api/v1/blocks',
    'http://127.0.0.1:8787/api/v1/blocks',
    'http://[::1]:8787/api/v1/blocks'
  ])('skips the check on %s', async (url) => {
    expect((await request(undefined, devEnv, url)).status).toBe(200)
  })

  it('refuses every request on a deployed host', async () => {
    const response = await request(undefined, devEnv)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'DEV_AUTH is set on a deployed worker',
      code: 'dev_auth_outside_local'
    })
  })

  it('refuses even a valid token on a deployed host while it is set', async () => {
    await serveCerts()
    const env = { ...deployedEnv, DEV_AUTH: 'true' } as Env
    expect((await request(await signToken(trusted.privateKey, {}), env)).status).toBe(500)
  })

  it('does not leak onto a lookalike hostname', async () => {
    const response = await request(
      undefined,
      devEnv,
      'https://localhost.evil.example/api/v1/blocks'
    )
    expect(response.status).toBe(500)
  })
})

describe('wrangler.jsonc', () => {
  const config = readFileSync(resolve(import.meta.dirname, '../wrangler.jsonc'), 'utf8')

  it('never sets DEV_AUTH, so no deploy carries it', () => {
    expect(config).not.toContain('DEV_AUTH')
  })
})
