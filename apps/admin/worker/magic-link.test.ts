import type { LoginLinkMessage } from '@studiobimo/backstage/admin'
import { AUTH } from '@studiobimo/backstage/internal'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app, mail, sent } from './magic-link-test-support'
import { openTestEnv } from './test-env'

const { dispose, db, env: testEnv } = await openTestEnv()
afterAll(dispose)

const ORIGIN = 'https://admin.example.com'
const KNOWN_EMAIL = 'editor@studio.test'
const SESSION_COOKIE = `__Host-${AUTH.cookie.name}`
const PROTECTED_PATH = '/api/v1/blocks'
const MINUTE_MS = 60_000
const STRANGER_EMAIL = 'nobody@studio.test'
const HASH_LENGTH = 64

type TestEnv = typeof testEnv.deployed & { AUTH_MODE?: string }

const magicLinkEnv: TestEnv = { ...testEnv.deployed, AUTH_MODE: AUTH.mode.magicLink }

interface PostOptions {
  env?: TestEnv
  headers?: Record<string, string>
  ip?: string
}

const post = (path: string, body: unknown, { env = magicLinkEnv, headers, ip }: PostOptions = {}) =>
  app.request(
    `${ORIGIN}/api/auth${path}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ip ? { [AUTH.rateLimit.ipHeader]: ip } : {}),
        ...headers
      },
      body: JSON.stringify(body)
    },
    env
  )

const requestLink = (email: string, options?: PostOptions) =>
  post(AUTH.paths.requestLink, { email }, options)

const verify = (token: string, options?: PostOptions) => post(AUTH.paths.verify, { token }, options)

const tokenOf = (message: LoginLinkMessage) =>
  new URL(message.link).searchParams.get(AUTH.tokenParam)!

const issueToken = async (email = KNOWN_EMAIL) => {
  await requestLink(email)
  return tokenOf(sent.at(-1)!)
}

const signIn = async () => {
  const response = await verify(await issueToken())
  return response.headers.get('set-cookie')!.split(';')[0]!
}

const callWithCookie = (cookie: string, path = PROTECTED_PATH, env = magicLinkEnv) =>
  app.request(`${ORIGIN}${path}`, { headers: { cookie } }, env)

const rows = async (table: string) =>
  (await db.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>()).results

beforeEach(async () => {
  sent.length = 0
  mail.fail = false
  await db.batch(
    ['sessions', 'login_tokens', 'auth_attempts', 'users'].map((table) =>
      db.prepare(`DELETE FROM ${table}`)
    )
  )
  await db
    .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
    .bind('user-1', KNOWN_EMAIL, 'Editor', Date.now())
    .run()
})

describe('requesting a link', () => {
  it('emails a link to a known user and stores only a hash of its token', async () => {
    const response = await requestLink(KNOWN_EMAIL)
    expect(response.status).toBe(202)
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe(KNOWN_EMAIL)
    expect(sent[0]!.link.startsWith(`${ORIGIN}${AUTH.signInPath}?`)).toBe(true)
    const [stored] = await rows('login_tokens')
    expect(stored!.token_hash).toHaveLength(HASH_LENGTH)
    expect(stored!.token_hash).not.toBe(tokenOf(sent[0]!))
    expect(stored!.email).toBe(KNOWN_EMAIL)
  })

  it('matches the address case-insensitively', async () => {
    await requestLink('  Editor@Studio.TEST ')
    expect(sent.map((message) => message.to)).toEqual([KNOWN_EMAIL])
  })

  it('answers an unknown address exactly as it answers a known one, and sends nothing', async () => {
    const known = await requestLink(KNOWN_EMAIL)
    const unknown = await requestLink(STRANGER_EMAIL)
    expect(unknown.status).toBe(known.status)
    expect(await unknown.text()).toBe(await known.text())
    expect(sent.map((message) => message.to)).toEqual([KNOWN_EMAIL])
    expect(await rows('login_tokens')).toHaveLength(1)
  })

  it('still answers the same when the mail cannot be sent', async () => {
    mail.fail = true
    const response = await requestLink(KNOWN_EMAIL)
    expect(response.status).toBe(202)
  })

  it('refuses an address that is not an email', async () => {
    const response = await requestLink('not-an-email')
    expect(response.status).toBe(400)
    expect(sent).toHaveLength(0)
  })

  it('refuses a body that is not JSON', async () => {
    const response = await post(
      AUTH.paths.requestLink,
      {},
      { headers: { 'content-type': 'application/xml' } }
    )
    expect(response.status).toBe(415)
  })

  it('refuses a cross-origin form post', async () => {
    const response = await post(
      AUTH.paths.requestLink,
      {},
      {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://evil.test'
        }
      }
    )
    expect(response.status).toBe(403)
  })
})

describe('rate limits', () => {
  it('stops a fourth request for one address, known or not', async () => {
    for (const email of [KNOWN_EMAIL, STRANGER_EMAIL]) {
      for (let attempt = 0; attempt < AUTH.rateLimit.perEmail; attempt += 1) {
        expect((await requestLink(email, { ip: `10.0.0.${attempt}` })).status).toBe(202)
      }
      const limited = await requestLink(email, { ip: '10.0.1.1' })
      expect(limited.status).toBe(429)
      expect(await limited.json()).toMatchObject({ code: 'too_many_requests' })
    }
    expect(sent).toHaveLength(AUTH.rateLimit.perEmail)
  })

  it('stops one IP address across many email addresses', async () => {
    for (let attempt = 0; attempt < AUTH.rateLimit.perIp; attempt += 1) {
      expect((await requestLink(`person${attempt}@studio.test`, { ip: '10.9.9.9' })).status).toBe(
        202
      )
    }
    expect((await requestLink('another@studio.test', { ip: '10.9.9.9' })).status).toBe(429)
    expect((await requestLink('another@studio.test', { ip: '10.9.9.8' })).status).toBe(202)
  })

  it('lets requests through again once the window has passed', async () => {
    for (let attempt = 0; attempt < AUTH.rateLimit.perEmail; attempt += 1) {
      await requestLink(KNOWN_EMAIL, { ip: `10.1.0.${attempt}` })
    }
    const past = Date.now() - AUTH.rateLimit.windowMs - MINUTE_MS
    await db.prepare('UPDATE auth_attempts SET created_at = ?').bind(past).run()
    expect((await requestLink(KNOWN_EMAIL, { ip: '10.1.1.1' })).status).toBe(202)
  })
})

describe('verifying a link', () => {
  it('starts a session in a host-bound, HttpOnly, Secure, SameSite=Lax cookie', async () => {
    const response = await verify(await issueToken())
    expect(response.status).toBe(204)
    const cookie = response.headers.get('set-cookie')!
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).not.toMatch(/domain=/i)
    expect(cookie).toMatch(/Max-Age=\d+/)
  })

  it('stores only a hash of the session id', async () => {
    const cookie = await signIn()
    const id = cookie.split('=')[1]!
    const [stored] = await rows('sessions')
    expect(stored!.id_hash).toHaveLength(HASH_LENGTH)
    expect(stored!.id_hash).not.toBe(id)
    expect(stored!.user_id).toBe('user-1')
  })

  it('lets the session through the gate as the editor', async () => {
    const cookie = await signIn()
    expect((await callWithCookie(cookie)).status).toBe(200)
    const session = await callWithCookie(cookie, `/api/auth${AUTH.paths.session}`)
    expect(await session.json()).toEqual({
      mode: 'magic-link',
      authenticated: true,
      signOut: 'session'
    })
  })
})

describe('refusing a link', () => {
  it('refuses a link used a second time', async () => {
    const token = await issueToken()
    expect((await verify(token)).status).toBe(204)
    const again = await verify(token)
    expect(again.status).toBe(400)
    expect(await again.json()).toMatchObject({ code: 'invalid_login_link' })
    expect(again.headers.get('set-cookie')).toBeNull()
  })

  it('refuses an expired link', async () => {
    const token = await issueToken()
    await db
      .prepare('UPDATE login_tokens SET expires_at = ?')
      .bind(Date.now() - 1)
      .run()
    expect((await verify(token)).status).toBe(400)
    expect(await rows('sessions')).toHaveLength(0)
  })

  it('refuses a token nobody issued', async () => {
    expect((await verify('0'.repeat(HASH_LENGTH))).status).toBe(400)
  })

  it('refuses a link whose user has been removed since', async () => {
    const token = await issueToken()
    await db.prepare('DELETE FROM users').run()
    await db
      .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .bind('user-2', 'someone-else@studio.test', '', Date.now())
      .run()
    expect((await verify(token)).status).toBe(400)
  })

  it('makes the first person to sign in the owner when nobody is set up yet', async () => {
    await db.prepare('DELETE FROM users').run()
    await requestLink(STRANGER_EMAIL, { env: { ...magicLinkEnv, OWNER_EMAIL: undefined } })
    expect(sent).toHaveLength(1)
    const response = await verify(tokenOf(sent[0]!), {
      env: { ...magicLinkEnv, OWNER_EMAIL: undefined }
    })
    expect(response.status).toBe(204)
    const [claimed] = await rows('users')
    expect(claimed).toMatchObject({ email: STRANGER_EMAIL, role: 'owner' })
  })

  it('lets only one of two concurrent uses succeed', async () => {
    const token = await issueToken()
    const statuses = (await Promise.all([verify(token), verify(token)])).map((r) => r.status)
    expect(statuses.sort()).toEqual([204, 400])
  })
})

describe('the gate in magic-link mode', () => {
  it('answers 401 without a session', async () => {
    const response = await app.request(`${ORIGIN}${PROTECTED_PATH}`, {}, magicLinkEnv)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Sign in to continue', code: 'unauthorized' })
  })

  it('answers 401 for a cookie that names no session', async () => {
    expect((await callWithCookie(`${SESSION_COOKIE}=${'a'.repeat(HASH_LENGTH)}`)).status).toBe(401)
  })

  it('answers 401 once the session has expired', async () => {
    const cookie = await signIn()
    await db
      .prepare('UPDATE sessions SET expires_at = ?')
      .bind(Date.now() - 1)
      .run()
    expect((await callWithCookie(cookie)).status).toBe(401)
  })

  it('answers 401 once the user is removed', async () => {
    const cookie = await signIn()
    await db.prepare('DELETE FROM users').run()
    expect((await callWithCookie(cookie)).status).toBe(401)
  })

  it('ignores an Access token', async () => {
    const response = await app.request(
      `${ORIGIN}${PROTECTED_PATH}`,
      { headers: { 'Cf-Access-Jwt-Assertion': 'a.b.c' } },
      {
        ...magicLinkEnv,
        ACCESS_TEAM_DOMAIN: 'https://studio.cloudflareaccess.com',
        ACCESS_AUD: 'x'
      }
    )
    expect(response.status).toBe(401)
  })

  it('reports an unauthenticated visitor to the sign-in page', async () => {
    const response = await app.request(`${ORIGIN}/api/auth${AUTH.paths.session}`, {}, magicLinkEnv)
    expect(await response.json()).toEqual({
      mode: 'magic-link',
      authenticated: false,
      signOut: 'session'
    })
  })
})

describe('signing out', () => {
  it('ends the session and clears the cookie', async () => {
    const cookie = await signIn()
    const response = await post(AUTH.paths.logout, {}, { headers: { cookie } })
    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/)
    expect(await rows('sessions')).toHaveLength(0)
    expect((await callWithCookie(cookie)).status).toBe(401)
  })

  it('succeeds without a session', async () => {
    expect((await post(AUTH.paths.logout, {})).status).toBe(204)
  })
})

describe('choosing the mode', () => {
  it('defaults to Access, where the magic-link routes do not exist', async () => {
    const accessEnv = { ...testEnv.deployed, AUTH_MODE: undefined }
    expect((await requestLink(KNOWN_EMAIL, { env: accessEnv })).status).toBe(404)
    expect((await verify('token', { env: accessEnv })).status).toBe(404)
    expect((await post(AUTH.paths.logout, {}, { env: accessEnv })).status).toBe(404)
    const gated = await app.request(`${ORIGIN}${PROTECTED_PATH}`, {}, accessEnv)
    expect(gated.status).toBe(403)
    const session = await app.request(`${ORIGIN}/api/auth${AUTH.paths.session}`, {}, accessEnv)
    expect(await session.json()).toEqual({
      mode: 'access',
      authenticated: false,
      signOut: 'access'
    })
  })

  it('does not accept a session cookie in Access mode', async () => {
    const cookie = await signIn()
    const accessEnv = { ...testEnv.deployed, AUTH_MODE: 'access' }
    expect((await callWithCookie(cookie, PROTECTED_PATH, accessEnv)).status).toBe(403)
  })

  it('answers 500 for a mode it does not know', async () => {
    const response = await app.request(
      `${ORIGIN}${PROTECTED_PATH}`,
      {},
      { ...testEnv.deployed, AUTH_MODE: 'password' }
    )
    expect(response.status).toBe(500)
  })

  it('keeps the local DEV_AUTH bypass in magic-link mode', async () => {
    const env = { ...testEnv.localDevelopment, AUTH_MODE: AUTH.mode.magicLink }
    const local = await app.request('http://localhost:5173/api/v1/blocks', {}, env)
    expect(local.status).toBe(200)
    const deployed = await app.request(`${ORIGIN}${PROTECTED_PATH}`, {}, env)
    expect(deployed.status).toBe(500)
  })
})
