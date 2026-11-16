import type { Context } from 'hono'
import type { z } from 'zod'

import type { CollectionRoute } from '../entry-pages.ts'
import {
  entryRouteKeysOf,
  entrySnapshotKeysOf,
  entrySnapshotRecords,
  entrySnapshotSchema,
  type EntrySnapshot
} from '../entry-publishing.ts'

import { logEvent } from '../observability.ts'
import { readPublishedIndex } from '../db/publishing.ts'
import { SEO } from '../seo.ts'
import {
  routeKeysOf,
  snapshotKey,
  snapshotKeysOf,
  snapshotRecords,
  readableSnapshotSchema,
  type Snapshot
} from '../publishing.ts'
import { siteSnapshotRecords, type SiteSnapshot } from '../site-publishing.ts'

export interface SnapshotFamily<S> {
  keysOf(ownerId: string, locales: readonly string[]): string[]
  parse(stored: unknown): S | null
  records(snapshots: readonly S[]): { key: string; value: string }[]
  routeKeys(snapshots: readonly S[]): string[]
}

const parsedBy =
  <S>(schema: z.ZodType<S>) =>
  (stored: unknown) => {
    const parsed = schema.safeParse(stored)
    return parsed.success ? parsed.data : null
  }

const PAGE_SNAPSHOTS: SnapshotFamily<Snapshot> = {
  keysOf: snapshotKeysOf,
  parse: parsedBy(readableSnapshotSchema),
  records: snapshotRecords,
  routeKeys: routeKeysOf
}

export const entrySnapshotsOf = (
  collection: string,
  route: CollectionRoute
): SnapshotFamily<EntrySnapshot> => ({
  keysOf: (id, locales) => entrySnapshotKeysOf(collection, id, locales),
  parse: parsedBy(entrySnapshotSchema),
  records: (snapshots) => entrySnapshotRecords(snapshots, route),
  routeKeys: (snapshots) => entryRouteKeysOf(snapshots, route)
})

const readFamily = async <S>(
  kv: KVNamespace,
  family: SnapshotFamily<S>,
  ownerId: string,
  locales: readonly string[]
) =>
  (
    await Promise.all(family.keysOf(ownerId, locales).map((key) => kv.get(key, { type: 'json' })))
  ).flatMap((stored) => {
    const parsed = family.parse(stored)
    return parsed === null ? [] : [parsed]
  })

const deleteRoutesOwnedBy = (kv: KVNamespace, ownerId: string, routes: readonly string[]) =>
  Promise.all(
    routes.map(async (route) => {
      if ((await kv.get(route)) === ownerId) await kv.delete(route)
    })
  )

export const writeSnapshotFamily = async <S>(
  kv: KVNamespace,
  family: SnapshotFamily<S>,
  ownerId: string,
  snapshots: readonly S[],
  locales: readonly string[]
) => {
  const previous = family.routeKeys(await readFamily(kv, family, ownerId, locales))
  await Promise.all(family.records(snapshots).map(({ key, value }) => kv.put(key, value)))
  const current = new Set(family.routeKeys(snapshots))
  await deleteRoutesOwnedBy(
    kv,
    ownerId,
    previous.filter((route) => !current.has(route))
  )
}

export const rewriteSnapshots = (kv: KVNamespace, snapshots: readonly Snapshot[]) =>
  Promise.all(
    snapshots.map((snapshot) =>
      kv.put(snapshotKey(snapshot.pageId, snapshot.locale), JSON.stringify(snapshot))
    )
  )

export const removeSnapshotFamily = async <S>(
  kv: KVNamespace,
  family: SnapshotFamily<S>,
  ownerId: string,
  locales: readonly string[]
) => {
  const routes = family.routeKeys(await readFamily(kv, family, ownerId, locales))
  await Promise.all(family.keysOf(ownerId, locales).map((key) => kv.delete(key)))
  await deleteRoutesOwnedBy(kv, ownerId, routes)
}

export const readSnapshots = (kv: KVNamespace, pageId: string, locales: readonly string[]) =>
  readFamily(kv, PAGE_SNAPSHOTS, pageId, locales)

export const writeSnapshots = (
  kv: KVNamespace,
  snapshots: readonly Snapshot[],
  locales: readonly string[]
) => writeSnapshotFamily(kv, PAGE_SNAPSHOTS, snapshots[0]?.pageId ?? '', snapshots, locales)

export const removeSnapshots = (kv: KVNamespace, pageId: string, locales: readonly string[]) =>
  removeSnapshotFamily(kv, PAGE_SNAPSHOTS, pageId, locales)

export const rebuildPublishedIndex = async (context: Context, d1: D1Database, kv: KVNamespace) => {
  try {
    await kv.put(SEO.indexKey, JSON.stringify(await readPublishedIndex(d1)))
  } catch (error) {
    logEvent('error', context, SEO.log.rebuildFailed, {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export const writeSiteSnapshots = (kv: KVNamespace, snapshots: readonly SiteSnapshot[]) =>
  Promise.all(siteSnapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))
