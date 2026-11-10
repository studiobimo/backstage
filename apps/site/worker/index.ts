import {
  API_ERROR,
  MEDIA,
  OBSERVABILITY,
  observe,
  reportError,
  respondHealthy
} from '@studiobimo/backstage'
import { registry } from '@studiobimo/backstage/example'
import { components } from '@studiobimo/backstage/example/components'
import { Hono, type Context } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { EDGE_CACHE, edgeCache } from './cache'
import { renderPage } from './page'
import { respondWithError } from './respond'
import { parseRoute } from './routing'
import { findPublished, findTranslations } from './store'
import { seoRoutes } from './seo'

const app = new Hono<{ Bindings: Env }>()

app.use(...observe)
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      fontSrc: ["'self'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    },
    xFrameOptions: 'DENY',
    permissionsPolicy: {
      camera: [],
      geolocation: [],
      microphone: [],
      payment: [],
      usb: []
    }
  })
)

app.get(OBSERVABILITY.health.path, respondHealthy)
app.route('/', seoRoutes)

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
  const route = parseRoute(c.req.path)
  const snapshot = route && (await findPublished(c.env.SITE!, route))
  if (!snapshot) return respondNotFound(c)
  return renderPage(
    {
      registry,
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
