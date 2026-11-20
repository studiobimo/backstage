export { BLOCK_PREVIEW } from '../blocks.ts'
export { defaultEdgeCache, EDGE_CACHE, withEdgeCache } from './cache.ts'
export type { Deferrable, EdgeCache } from './cache.ts'
export { FORM_PAYLOAD, readFormPayload } from './form-payload.ts'
export type { FormPayload } from './form-payload.ts'
export { renderHtml } from './html.ts'
export { CURRENCY_CODES, formatMoney, MONEY } from '../money.ts'
export type { CurrencyCode } from '../money.ts'
export { bookingDuration, BOOKING, occupiedAt, rangesOverlap } from '../bookings.ts'
export type { BookingFields, DurationBounds, InstantRange, OccupiedQuery } from '../bookings.ts'
export { viteAssets, VITE_ASSETS, viteManifestSchema } from '../vite-assets.ts'
export type { ViteAssets, ViteAssetsOptions, ViteManifest } from '../vite-assets.ts'
export { isOpenAt, nextOpening, slotsFor, WEEKLY_HOURS } from '../weekly-hours.ts'
export type { HoursRange, Instant, OpenState, SlotOptions, WeeklyHours } from '../weekly-hours.ts'
export { localeName, LOCALE_NAME, SWITCHER_LABEL, switcherLabel } from './locales.ts'
export { respondWithMedia } from './media.ts'
export type { MediaObject, MediaReader } from './media.ts'
export { parseEntryRoute, parseRoute, pathOf, routeOf } from './routing.ts'
export type { EntryRoute, Route } from './routing.ts'
export { readPublishedPages, respondWithRobots, respondWithSitemap } from './seo.ts'
export {
  alternateLinks,
  canonicalUrl,
  EMPTY_PUBLISHED_INDEX,
  publishedIndexSchema,
  SEO,
  upsertIntoIndex
} from '../seo.ts'
export type { AlternateLink } from '../seo.ts'
export {
  routeKey,
  SITE_VERSION,
  SNAPSHOT,
  snapshotKey,
  snapshotRecords,
  snapshotSchema
} from '../publishing.ts'
export type { Snapshot } from '../publishing.ts'
export {
  ENTRY_SNAPSHOT,
  entryRouteKey,
  entryRouteKeysOf,
  entrySnapshotKey,
  entrySnapshotKeysOf,
  entrySnapshotRecords,
  entrySnapshotSchema
} from '../entry-publishing.ts'
export type { EntrySnapshot } from '../entry-publishing.ts'
export { entryPathOf } from '../entry-pages.ts'
export type { CollectionRoute } from '../entry-pages.ts'
export type { PageBlock } from '../pages.ts'
export {
  SITE_SNAPSHOT,
  siteSnapshotKey,
  siteSnapshotRecords,
  siteSnapshotSchema
} from '../site-publishing.ts'
export type { SiteSnapshot } from '../site-publishing.ts'
export { adminRpc, requestContextOf } from './rpc.ts'
export { RPC } from '../rpc.ts'
export type { PingResult, RequestContext, VisitorRpc } from '../rpc.ts'
export { SUBMISSION } from '../submissions.ts'
export type { StatusResult, SubmitResult } from '../submissions.ts'
export { TURNSTILE, verifyTurnstile } from './turnstile.ts'
export type { TurnstileCheck, TurnstileFailure, TurnstileResult } from './turnstile.ts'
export {
  findCollectionEntries,
  findEntryTranslations,
  findFormProjection,
  findPublished,
  findPublishedEntry,
  findRegistrySettings,
  findSiteSnapshot,
  findTranslations
} from './store.ts'
export type {
  CollectionEntryQuery,
  CollectionEntryRead,
  FormProjectionRead,
  KvReader
} from './store.ts'
export { collectionSnapshotKey, collectionSnapshotOf } from '../collection-snapshot.ts'
export { FORM_PROJECTION, formProjectionKey } from '../form-projection.ts'
export type { FormProjection } from '../form-projection.ts'

import type { VisitorRpc } from '../rpc.ts'

export interface SiteEnv {
  SITE: KVNamespace
  MEDIA: R2Bucket
  SITE_URL: string
  ADMIN_ORIGIN?: string
  ADMIN?: VisitorRpc
  ASSETS?: Fetcher
}
