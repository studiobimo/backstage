import {
  API_ERROR,
  MEDIA,
  OBSERVABILITY,
  observe,
  reportError,
  respondHealthy
} from '@studiobimo/backstage'
import { registry } from '@studiobimo/backstage/example'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { renderPage } from './page'
import { respondWithError } from './respond'
import { parseRoute } from './routing'
import { findPublished, findTranslations } from './store'

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

app.get('*', async (c) => {
  const route = parseRoute(c.req.path)
  const snapshot = route && (await findPublished(c.env.SITE!, route))
  if (!snapshot) return respondWithError(c, API_ERROR.notFound)
  return renderPage(
    {
      registry,
      snapshot,
      translations: await findTranslations(c.env.SITE!, snapshot),
      origin: new URL(c.req.url).origin
    },
    {}
  )
})

app.notFound((c) => respondWithError(c, API_ERROR.notFound))
app.onError((error, c) => {
  reportError(c, error)
  return respondWithError(c, API_ERROR.internal)
})

export default app
