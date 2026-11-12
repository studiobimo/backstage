import { describe, expect, it } from 'vitest'

import { EDGE_CACHE, withEdgeCache, type EdgeCache } from './cache.ts'

const URL_OF_PAGE = 'https://example.com/about'

function memoryCache() {
  const stored = new Map<string, Response>()
  const cache: EdgeCache = {
    match: async (request) => stored.get(request.url)?.clone(),
    put: async (request, response) => void stored.set(request.url, response)
  }
  return { cache, stored }
}

function context() {
  const pending: Promise<unknown>[] = []
  return { waitUntil: (promise: Promise<unknown>) => void pending.push(promise), pending }
}

const page = (status = 200) => new Response('page', { status })

describe('withEdgeCache', () => {
  it('stores a page and answers the next request without producing it', async () => {
    const { cache } = memoryCache()
    const ctx = context()
    let produced = 0
    const produce = async () => (produced++, page())
    await withEdgeCache(new Request(URL_OF_PAGE), ctx, produce, cache)
    await Promise.all(ctx.pending)
    const again = await withEdgeCache(new Request(URL_OF_PAGE), ctx, produce, cache)
    expect(produced).toBe(1)
    expect(await again.text()).toBe('page')
  })

  it('ignores the query string, so random queries share one entry', async () => {
    const { cache, stored } = memoryCache()
    const ctx = context()
    let produced = 0
    const produce = async () => (produced++, page())
    await withEdgeCache(new Request(`${URL_OF_PAGE}?x=1`), ctx, produce, cache)
    await Promise.all(ctx.pending)
    await withEdgeCache(new Request(`${URL_OF_PAGE}?x=2&y=3`), ctx, produce, cache)
    await withEdgeCache(new Request(URL_OF_PAGE), ctx, produce, cache)
    expect(produced).toBe(1)
    expect([...stored.keys()]).toEqual([URL_OF_PAGE])
  })

  it('stores a 404 and nothing else that failed', async () => {
    const { cache, stored } = memoryCache()
    const ctx = context()
    await withEdgeCache(new Request(`${URL_OF_PAGE}-missing`), ctx, async () => page(404), cache)
    await withEdgeCache(new Request(`${URL_OF_PAGE}-broken`), ctx, async () => page(500), cache)
    await Promise.all(ctx.pending)
    expect([...stored.keys()]).toEqual([`${URL_OF_PAGE}-missing`])
  })

  it('returns a response whose headers can be changed, even from a redirect', async () => {
    const { cache, stored } = memoryCache()
    stored.set(URL_OF_PAGE, Response.redirect('https://example.com/elsewhere', 302))
    const response = await withEdgeCache(
      new Request(URL_OF_PAGE),
      context(),
      async () => page(),
      cache
    )
    response.headers.set('X-Added', '1')
    expect(response.status).toBe(302)
  })

  it('just produces the response when there is no cache', async () => {
    const response = await withEdgeCache(
      new Request(URL_OF_PAGE),
      context(),
      async () => page(),
      undefined
    )
    expect(response.status).toBe(200)
  })

  it('names a short shared lifetime with stale-while-revalidate', () => {
    expect(EDGE_CACHE.control).toMatch(/s-maxage=30.*stale-while-revalidate=\d+/)
  })
})
