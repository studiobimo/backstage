import { API_ERROR } from '@studiobimo/backstage'
import { createMiddleware } from 'hono/factory'

export const EDGE_CACHE = {
  control: 'public, max-age=0, s-maxage=30, stale-while-revalidate=15'
} as const

export const edgeCache = createMiddleware(async (c, next) => {
  const cache = typeof caches === 'undefined' ? undefined : caches.default
  if (!cache) return next()
  const hit = await cache.match(c.req.raw)
  if (hit) return hit
  await next()
  const { res } = c
  if (res.ok || res.status === API_ERROR.notFound.status) {
    c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()))
  }
})
