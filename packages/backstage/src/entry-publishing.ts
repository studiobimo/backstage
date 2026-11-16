import { z } from 'zod'

import { entryRoutePath } from './entry-pages.ts'
import type { Locale } from './locales.ts'
import { routeKey, snapshotMediaSchema, SNAPSHOT } from './publishing.ts'

export const ENTRY_SNAPSHOT = {
  format: 1,
  key: { prefix: 'entry' }
} as const

export const entrySnapshotKey = (collection: string, entryId: string, locale: Locale) =>
  [ENTRY_SNAPSHOT.key.prefix, collection, entryId, locale].join(SNAPSHOT.key.separator)

export const entrySnapshotKeysOf = (
  collection: string,
  entryId: string,
  locales: readonly Locale[]
) => locales.map((locale) => entrySnapshotKey(collection, entryId, locale))

export const entrySnapshotSchema = z.object({
  format: z.literal(ENTRY_SNAPSHOT.format),
  collection: z.string(),
  entryId: z.string(),
  locale: z.string(),
  slug: z.string(),
  title: z.string(),
  schemaVersion: z.number().int(),
  version: z.number().int(),
  publishedAt: z.number().int(),
  content: z.json(),
  media: z.record(z.string(), snapshotMediaSchema)
})
export type EntrySnapshot = z.infer<typeof entrySnapshotSchema>

export const entryRouteKey = (locale: Locale, route: { path: string }, slug: string) =>
  routeKey(locale, entryRoutePath(route, slug))

export const entrySnapshotRecords = (
  snapshots: readonly EntrySnapshot[],
  route: { path: string }
) =>
  snapshots.flatMap((snapshot) => [
    {
      key: entrySnapshotKey(snapshot.collection, snapshot.entryId, snapshot.locale),
      value: JSON.stringify(snapshot)
    },
    { key: entryRouteKey(snapshot.locale, route, snapshot.slug), value: snapshot.entryId }
  ])

export const entryRouteKeysOf = (snapshots: readonly EntrySnapshot[], route: { path: string }) =>
  snapshots.map(({ locale, slug }) => entryRouteKey(locale, route, slug))
