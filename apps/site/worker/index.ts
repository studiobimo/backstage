import {
  API_ERROR,
  MEDIA,
  OBSERVABILITY,
  observe,
  reportError,
  respondHealthy
} from '@studiobimo/backstage'
import { findPublished, findTranslations, routeOf } from '@studiobimo/backstage/site'
import { Hono, type Context } from 'hono'

import { components } from '../src/blocks/component-map'
import { EDGE_CACHE, edgeCache } from './cache'
import { renderPage } from './page'
import { previewRoutes } from './preview'
import { respondWithError } from './respond'
import { securityHeaders } from './security'
import { seoRoutes } from './seo'
import { stylesheetRoutes } from './stylesheet'

const app = new Hono<{ Bindings: Env }>()

app.use(...observe)
app.use(securityHeaders)

app.get(OBSERVABILITY.health.path, respondHealthy)
app.route('/', seoRoutes)
app.route('/', stylesheetRoutes)
app.route('/', previewRoutes)

app.get('/media/*', async (c) => {
  const object = await c.env.MEDIA!.get(c.req.path.slice(1))
  if (!object) return respondWithError(c, API_ERROR.notFound)
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': MEDIA.cacheControl
    }
  })
})

const respondNotFound = (c: Context) =>
  respondWithError(c, API_ERROR.notFound, { 'Cache-Control': EDGE_CACHE.control })

app.get('*', edgeCache, async (c) => {
  const route = routeOf(c.req.raw)
  const snapshot = route && (await findPublished(c.env.SITE!, route))
  if (!snapshot) return respondNotFound(c)
  return renderPage(
    {
      components,
      snapshot,
      translations: await findTranslations(c.env.SITE!, snapshot),
      origin: new URL(c.req.url).origin
    },
    { 'Cache-Control': EDGE_CACHE.control }
  )
})

app.notFound((c) => respondWithError(c, API_ERROR.notFound))
app.onError((error, c) => {
  reportError(c, error)
  return respondWithError(c, API_ERROR.internal)
})

export default app
