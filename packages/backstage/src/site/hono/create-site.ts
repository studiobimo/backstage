import { Hono, type Context } from 'hono'

import { API_ERROR } from '../../errors.ts'
import type { ComponentMap } from '../../components.ts'
import { collectionsOf } from '../../collections.ts'
import { routesOf } from '../../entry-pages.ts'
import { resolveLocaleConfig } from '../../locales.ts'
import { OBSERVABILITY, observe, reportError, respondHealthy } from '../../observability.ts'
import { SEO } from '../../seo.ts'
import { defaultEdgeCache, EDGE_CACHE, withEdgeCache } from '../cache.ts'
import { respondWithMedia } from '../media.ts'
import { routeOf } from '../routing.ts'
import { respondWithRobots, respondWithSitemap } from '../seo.ts'
import { findPublished, findSiteSnapshot, findTranslations, readSiteVersion } from '../store.ts'
import type { SiteEnv } from '../index.ts'
import { renderPage, type DocumentContext, type SiteFavicon, type SiteHead } from './document.tsx'
import { renderEntryRoute } from './entry-route.ts'
import { atSiteOrigin, siteOriginOf } from './origin.ts'
import { previewRoutes, type SitePreview } from './preview.ts'
import { pagePreviewRoutes } from './page-preview.ts'
import { respondWithError } from './respond.ts'
import { securityHeaders, type ContentSecurityPolicyAdditions } from './security.ts'
import { stylesheetPathFor, stylesheetRoutes } from './stylesheet.ts'

export type SiteApp = Hono<{ Bindings: SiteEnv }>

export interface CreateSiteOptions {
  components: ComponentMap
  stylesheet: string
  preview?: SitePreview
  contentSecurityPolicy?: ContentSecurityPolicyAdditions
  favicon?: SiteFavicon
  head?: SiteHead
  routes?: (app: SiteApp) => void
}

const CACHED = { 'Cache-Control': EDGE_CACHE.control } as const

export const createSite = (options: CreateSiteOptions) => {
  const { components, stylesheet, preview, contentSecurityPolicy, favicon, head, routes } = options
  const locales = resolveLocaleConfig(components.registry)
  const document: DocumentContext = {
    components,
    locales,
    stylesheetPath: stylesheetPathFor(stylesheet),
    favicon,
    head
  }
  const entryRoutes = routesOf(collectionsOf(components.registry).values())
  const app: SiteApp = new Hono<{ Bindings: SiteEnv }>()

  app.use(...observe)
  app.use(securityHeaders(contentSecurityPolicy))

  app.get(OBSERVABILITY.health.path, respondHealthy)
  app.get(SEO.sitemapPath, (c) =>
    respondWithSitemap(
      c.env.SITE,
      atSiteOrigin(c.req.raw, siteOriginOf(c.env)),
      locales,
      entryRoutes
    )
  )
  app.get(SEO.robotsPath, (c) => respondWithRobots(atSiteOrigin(c.req.raw, siteOriginOf(c.env))))
  app.route('/', stylesheetRoutes(stylesheet))
  if (preview) app.route('/', previewRoutes(preview, document))
  app.route('/', pagePreviewRoutes(document))

  app.get('/media/*', async (c) => {
    const response = await respondWithMedia(c.env.MEDIA, c.req.raw)
    return response ?? respondWithError(c, API_ERROR.notFound)
  })

  routes?.(app)

  const renderRoute = async (c: Context<{ Bindings: SiteEnv }>) => {
    const entryPage = await renderEntryRoute(c, document, entryRoutes, CACHED)
    if (entryPage) return entryPage
    const route = routeOf(c.req.raw, locales)
    const snapshot = route && (await findPublished(c.env.SITE, route))
    if (!snapshot) return respondWithError(c, API_ERROR.notFound, CACHED)
    const [translations, site] = await Promise.all([
      findTranslations(c.env.SITE, snapshot, locales.locales),
      findSiteSnapshot(c.env.SITE, snapshot.locale)
    ])
    return renderPage(
      { ...document, snapshot, translations, site, siteOrigin: siteOriginOf(c.env) },
      CACHED
    )
  }

  app.get('*', async (c) =>
    withEdgeCache(
      c.req.raw,
      { waitUntil: (work) => c.executionCtx.waitUntil(work) },
      () => renderRoute(c),
      defaultEdgeCache(),
      await readSiteVersion(c.env.SITE)
    )
  )

  app.notFound((c) => respondWithError(c, API_ERROR.notFound))
  app.onError((error, c) => {
    reportError(c, error)
    return respondWithError(c, API_ERROR.internal)
  })

  return app
}
