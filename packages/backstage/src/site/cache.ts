import { API_ERROR } from '../errors.ts'

export const EDGE_CACHE = {
  control: 'public, max-age=0, s-maxage=30, stale-while-revalidate=15'
} as const

export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

export interface Deferrable {
  waitUntil(promise: Promise<unknown>): void
}

export const defaultEdgeCache = () =>
  (globalThis as { caches?: { default?: EdgeCache } }).caches?.default

const isCacheable = ({ ok, status }: Response) => ok || status === API_ERROR.notFound.status

const cacheKeyOf = (request: Request) => {
  const url = new URL(request.url)
  url.search = ''
  return new Request(url, { method: request.method })
}

export async function withEdgeCache(
  request: Request,
  context: Deferrable,
  produce: () => Promise<Response>,
  cache = defaultEdgeCache()
) {
  if (!cache) return produce()
  const key = cacheKeyOf(request)
  const hit = await cache.match(key)
  if (hit) return new Response(hit.body, hit)
  const response = await produce()
  if (isCacheable(response)) context.waitUntil(cache.put(key, response.clone()))
  return response
}
