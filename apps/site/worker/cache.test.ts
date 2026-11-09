import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearKv, get, kv, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())

const stored = new Map<string, Response>()
const pending: Promise<unknown>[] = []
const executionCtx = {
  waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
  passThroughOnException: () => undefined,
  props: {}
} as ExecutionContext

beforeEach(async () => {
  stored.clear()
  vi.stubGlobal('caches', {
    default: {
      match: async (request: Request) => stored.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => void stored.set(request.url, response)
    }
  })
  await clearKv()
  await publishSnapshots(snapshotOf({ locale: 'en' }), snapshotOf({ locale: 'es', slug: 'acerca' }))
})
afterEach(() => vi.unstubAllGlobals())

const request = async (path: string) => {
  const response = await get(path, executionCtx)
  await Promise.all(pending.splice(0))
  return response
}

describe('edge caching', () => {
  it('sends a short s-maxage with stale-while-revalidate', async () => {
    const control = (await request('/about')).headers.get('Cache-Control')
    expect(control).toMatch(/s-maxage=30/)
    expect(control).toMatch(/stale-while-revalidate=\d+/)
  })

  it('serves a repeated request from the cache without reading KV', async () => {
    await request('/about')
    const read = vi.spyOn(kv, 'get')
    const again = await request('/about')
    expect(again.status).toBe(200)
    expect(await again.text()).toContain('<html lang="en">')
    expect(read).not.toHaveBeenCalled()
  })

  it('adds the security headers to a cached response whose headers are read-only', async () => {
    stored.set('http://localhost/about', Response.redirect('http://localhost/elsewhere', 302))
    const response = await request('/about')
    expect(response.status).toBe(302)
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('caches a 404 briefly and not the health check or media', async () => {
    const missing = await request('/nope')
    expect(missing.headers.get('Cache-Control')).toMatch(/s-maxage=30/)
    await request('/health')
    expect(stored.has('http://localhost/nope')).toBe(true)
    expect(stored.has('http://localhost/health')).toBe(false)
  })

  it('keeps the security headers on a cached response', async () => {
    await request('/about')
    const cached = await request('/about')
    expect(cached.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
  })
})
