import type { Context } from 'hono'

import {
  logEvent,
  readPublishedIndex,
  SEO,
  routeKeysOf,
  snapshotKeysOf,
  snapshotRecords,
  siteSnapshotRecords,
  snapshotSchema,
  type SiteSnapshot,
  type Snapshot
} from '../index.ts'

const readSnapshots = async (kv: KVNamespace, pageId: string) =>
  (await Promise.all(snapshotKeysOf(pageId).map((key) => kv.get(key, { type: 'json' })))).flatMap(
    (stored) => {
      const parsed = snapshotSchema.safeParse(stored)
      return parsed.success ? [parsed.data] : []
    }
  )

const deleteRoutesOwnedBy = (kv: KVNamespace, pageId: string, routes: readonly string[]) =>
  Promise.all(
    routes.map(async (route) => {
      if ((await kv.get(route)) === pageId) await kv.delete(route)
    })
  )

export const writeSnapshots = async (kv: KVNamespace, snapshots: readonly Snapshot[]) => {
  const [first] = snapshots
  const previous = first ? routeKeysOf(await readSnapshots(kv, first.pageId)) : []
  await Promise.all(snapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))
  const current = new Set(routeKeysOf(snapshots))
  await deleteRoutesOwnedBy(
    kv,
    first?.pageId ?? '',
    previous.filter((route) => !current.has(route))
  )
}

export const removeSnapshots = async (kv: KVNamespace, pageId: string) => {
  const routes = routeKeysOf(await readSnapshots(kv, pageId))
  await Promise.all(snapshotKeysOf(pageId).map((key) => kv.delete(key)))
  await deleteRoutesOwnedBy(kv, pageId, routes)
}

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
