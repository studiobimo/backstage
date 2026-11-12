import { afterAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, env } = await openTestEnv()
afterAll(dispose)

const POLICY = "default-src 'none'; img-src 'self' blob:; frame-ancestors 'none'"
const SITE = 'https://site.test'

const withAssets = (
  siteOrigin: string,
  headers: Record<string, string> = {},
  base = env.deployed
) =>
  ({
    ...base,
    SITE_ORIGIN: siteOrigin,
    ASSETS: { fetch: async () => new Response('<html></html>', { headers }) }
  }) as unknown as Env

const directive = (response: Response, name: string) =>
  new RegExp(`${name} ([^;]+)`).exec(response.headers.get('Content-Security-Policy') ?? '')?.[1]

const frameSrc = (response: Response) => directive(response, 'frame-src')

describe('the SPA through the worker', () => {
  it('lets the page frame the site and nothing else', async () => {
    const response = await app.request(
      '/blocks',
      {},
      withAssets(`${SITE}/ignored/path`, { 'Content-Security-Policy': POLICY })
    )
    expect(frameSrc(response)).toBe(SITE)
    expect(directive(response, 'img-src')).toBe(`'self' blob: ${SITE}`)
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    expect(await response.text()).toBe('<html></html>')
  })

  it('allows no frame when no site origin is set', async () => {
    const response = await app.request(
      '/blocks',
      {},
      withAssets('', { 'Content-Security-Policy': POLICY })
    )
    expect(frameSrc(response)).toBeUndefined()
    expect(directive(response, 'img-src')).toBe("'self' blob:")
  })

  it('adds an img-src when the policy has none', async () => {
    const response = await app.request(
      '/blocks',
      {},
      withAssets(SITE, { 'Content-Security-Policy': "default-src 'none'" })
    )
    expect(directive(response, 'img-src')).toBe(SITE)
  })

  it('leaves a response without a policy as it is', async () => {
    const response = await app.request('/assets/app.js', {}, withAssets(SITE))
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('keeps /api out of the SPA', async () => {
    const response = await app.request(
      '/api/nothing-here',
      {},
      withAssets(SITE, {}, env.localDevelopment)
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found', code: 'not_found' })
  })

  it('serves the site origin to a signed-in editor and not to others', async () => {
    const editor = await app.request('/api/v1/site-origin', {}, env.localDevelopment)
    expect(await editor.json()).toEqual({ origin: 'http://localhost:5174' })
    expect((await app.request('/api/v1/site-origin', {}, env.deployed)).status).toBe(403)
  })
})
