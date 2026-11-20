import type { Context } from 'hono'

import type { CollectionRoute } from '../../entry-pages.ts'
import { parseEntryRoute } from '../routing.ts'
import { findEntryTranslations, findPublishedEntry, findSiteSnapshot } from '../store.ts'
import type { SiteEnvironment } from './create-site.ts'
import { renderEntryPage, type DocumentContext } from './document.tsx'
import { siteOriginOf } from './origin.ts'

export const renderEntryRoute = async <Extra extends object>(
  c: Context<SiteEnvironment<Extra>>,
  document: DocumentContext,
  entryRoutes: Readonly<Record<string, CollectionRoute>>,
  headers: HeadersInit
) => {
  const { locales } = document
  const entryRoute = parseEntryRoute(new URL(c.req.url).pathname, entryRoutes, locales)
  const route = entryRoute && entryRoutes[entryRoute.collection]
  const snapshot = entryRoute && route && (await findPublishedEntry(c.env.SITE, entryRoute, route))
  if (!snapshot || !route) return null
  const [translations, site] = await Promise.all([
    findEntryTranslations(c.env.SITE, snapshot, locales.locales),
    findSiteSnapshot(c.env.SITE, snapshot.locale)
  ])
  return renderEntryPage(
    { ...document, snapshot, translations, site, route, siteOrigin: siteOriginOf(c.env) },
    headers
  )
}
