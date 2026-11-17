import { API_ERROR } from '../errors.ts'

export const EDGE_CACHE = {
  control: 'public, max-age=0, s-maxage=30, stale-while-revalidate=15',
  bypass: { query: 'nocache', header: 'x-bypass-cache' },
  versionParam: 'v'
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

const wantsBypass = (request: Request) =>
  request.headers.has(EDGE_CACHE.bypass.header) ||
  new URL(request.url).searchParams.has(EDGE_CACHE.bypass.query)

const cacheKeyOf = (request: Request, version?: string) => {
  const url = new URL(request.url)
  url.search = ''
  if (version) url.searchParams.set(EDGE_CACHE.versionParam, version)
  return new Request(url, { method: request.method })
}

export async function withEdgeCache(
  request: Request,
  context: Deferrable,
  produce: () => Promise<Response>,
  cache = defaultEdgeCache(),
  version?: string
) {
  if (!cache || wantsBypass(request)) return produce()
  const key = cacheKeyOf(request, version)
  const hit = await cache.match(key)
  if (hit) return new Response(hit.body, hit)
  const response = await produce()
  if (isCacheable(response)) context.waitUntil(cache.put(key, response.clone()))
  return response
}
