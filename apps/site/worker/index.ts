import {
  API_ERROR,
  OBSERVABILITY,
  SEO,
  observe,
  reportError,
  respondHealthy
} from '@studiobimo/backstage'
import {
  EDGE_CACHE,
  findPublished,
  findTranslations,
  respondWithMedia,
  respondWithRobots,
  respondWithSitemap,
  routeOf,
  withEdgeCache
} from '@studiobimo/backstage/site'
import { Hono, type Context } from 'hono'

import { components } from '../src/blocks/component-map'
import { renderPage } from './page'
import { previewRoutes } from './preview'
import { respondWithError } from './respond'
import { securityHeaders } from './security'
import { atSiteOrigin, siteOriginOf } from './seo'
import { stylesheetRoutes } from './stylesheet'

const app = new Hono<{ Bindings: Env }>()

app.use(...observe)
app.use(securityHeaders)

app.get(OBSERVABILITY.health.path, respondHealthy)
app.get(SEO.sitemapPath, (c) =>
  respondWithSitemap(c.env.SITE!, atSiteOrigin(c.req.raw, siteOriginOf(c.env)))
)
app.get(SEO.robotsPath, (c) => respondWithRobots(atSiteOrigin(c.req.raw, siteOriginOf(c.env))))
app.route('/', stylesheetRoutes)
app.route('/', previewRoutes)

app.get('/media/*', async (c) => {
  const response = await respondWithMedia(c.env.MEDIA!, c.req.raw)
  return response ?? respondWithError(c, API_ERROR.notFound)
})

const respondNotFound = (c: Context) =>
  respondWithError(c, API_ERROR.notFound, { 'Cache-Control': EDGE_CACHE.control })

const renderRoute = async (c: Context<{ Bindings: Env }>) => {
  const route = routeOf(c.req.raw)
  const snapshot = route && (await findPublished(c.env.SITE!, route))
  if (!snapshot) return respondNotFound(c)
  return renderPage(
    {
      components,
      snapshot,
      translations: await findTranslations(c.env.SITE!, snapshot),
      siteOrigin: siteOriginOf(c.env)
    },
    { 'Cache-Control': EDGE_CACHE.control }
  )
}

app.get('*', (c) =>
  withEdgeCache(c.req.raw, { waitUntil: (work) => c.executionCtx.waitUntil(work) }, () =>
    renderRoute(c)
  )
)

app.notFound((c) => respondWithError(c, API_ERROR.notFound))
app.onError((error, c) => {
  reportError(c, error)
  return respondWithError(c, API_ERROR.internal)
})

export default app
