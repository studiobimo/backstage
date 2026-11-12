export { defaultEdgeCache, EDGE_CACHE, withEdgeCache } from './cache.ts'
export type { Deferrable, EdgeCache } from './cache.ts'
export { renderHtml } from './html.ts'
export { LOCALE_NAME, SWITCHER_LABEL } from './locales.ts'
export { respondWithMedia } from './media.ts'
export type { MediaObject, MediaReader } from './media.ts'
export { parseRoute, pathOf, routeOf } from './routing.ts'
export type { Route } from './routing.ts'
export { readPublishedPages, respondWithRobots, respondWithSitemap } from './seo.ts'
export { findPublished, findSiteSnapshot, findTranslations } from './store.ts'
export type { KvReader } from './store.ts'

export interface SiteEnv {
  SITE: KVNamespace
  MEDIA: R2Bucket
  ADMIN_ORIGIN?: string
}
