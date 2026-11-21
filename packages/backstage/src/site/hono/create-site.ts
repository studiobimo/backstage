import { Hono, type Context } from 'hono'

import { assertSameOriginPaths } from '../../client-scripts.ts'
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
import { hasClientScripts } from './client-scripts.ts'
import { securityHeaders, type ContentSecurityPolicyAdditions } from './security.ts'
import { stylesheetPathFor, stylesheetRoutes } from './stylesheet.ts'

interface SiteVariables {
  siteDocument: DocumentContext
}

export interface SiteEnvironment<Extra extends object = object> {
  Bindings: SiteEnv & Extra
  Variables: SiteVariables
}

export type SiteApp<Extra extends object = object> = Hono<SiteEnvironment<Extra>>

export interface CreateSiteOptions<Extra extends object = object> {
  components: ComponentMap
  stylesheet: string
  preview?: SitePreview
  scripts?: readonly string[]
  contentSecurityPolicy?: ContentSecurityPolicyAdditions
  turnstile?: boolean
  favicon?: SiteFavicon
  head?: SiteHead
  routes?: (app: SiteApp<Extra>) => void
}

const SITE_SCRIPTS_OWNER = 'createSite scripts'

const CACHED = { 'Cache-Control': EDGE_CACHE.control } as const

const contentRendererOf =
  <Extra extends object>(document: DocumentContext, entryRoutes: ReturnType<typeof routesOf>) =>
  async (c: Context<SiteEnvironment<Extra>>) => {
    const entryPage = await renderEntryRoute(c, document, entryRoutes, CACHED)
    if (entryPage) return entryPage
    const route = routeOf(c.req.raw, document.locales)
    const snapshot = route && (await findPublished(c.env.SITE, route))
    if (!snapshot) return respondWithError(c, API_ERROR.notFound, CACHED)
    const [translations, site] = await Promise.all([
      findTranslations(c.env.SITE, snapshot, document.locales.locales),
      findSiteSnapshot(c.env.SITE, snapshot.locale)
    ])
    return renderPage(
      { ...document, snapshot, translations, site, siteOrigin: siteOriginOf(c.env) },
      CACHED
    )
  }

export const createSite = <Extra extends object = object>(options: CreateSiteOptions<Extra>) => {
  const {
    components,
    stylesheet,
    preview,
    scripts = [],
    contentSecurityPolicy,
    turnstile,
    favicon,
    head,
    routes
  } = options
  assertSameOriginPaths(SITE_SCRIPTS_OWNER, scripts)
  const locales = resolveLocaleConfig(components.registry)
  const document: DocumentContext = {
    components,
    locales,
    stylesheetPath: stylesheetPathFor(stylesheet),
    siteScripts: scripts,
    favicon,
    head
  }
  const entryRoutes = routesOf(collectionsOf(components.registry).values())
  const app: SiteApp<Extra> = new Hono<SiteEnvironment<Extra>>()

  app.use(...observe)
  app.use(async (c, next) => {
    c.set('siteDocument', document)
    await next()
  })
  app.use(
    securityHeaders(contentSecurityPolicy, {
      turnstile,
      clientScripts: hasClientScripts(components, scripts)
    })
  )

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

  const renderRoute = contentRendererOf<Extra>(document, entryRoutes)

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
