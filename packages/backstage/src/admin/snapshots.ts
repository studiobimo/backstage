import type { Context } from 'hono'

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

export const readSnapshots = async (kv: KVNamespace, pageId: string, locales: readonly string[]) =>
  (
    await Promise.all(snapshotKeysOf(pageId, locales).map((key) => kv.get(key, { type: 'json' })))
  ).flatMap((stored) => {
    const parsed = readableSnapshotSchema.safeParse(stored)
    return parsed.success ? [parsed.data] : []
  })

const deleteRoutesOwnedBy = (kv: KVNamespace, pageId: string, routes: readonly string[]) =>
  Promise.all(
    routes.map(async (route) => {
      if ((await kv.get(route)) === pageId) await kv.delete(route)
    })
  )

export const writeSnapshots = async (
  kv: KVNamespace,
  snapshots: readonly Snapshot[],
  locales: readonly string[]
) => {
  const [first] = snapshots
  const previous = first ? routeKeysOf(await readSnapshots(kv, first.pageId, locales)) : []
  await Promise.all(snapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))
  const current = new Set(routeKeysOf(snapshots))
  await deleteRoutesOwnedBy(
    kv,
    first?.pageId ?? '',
    previous.filter((route) => !current.has(route))
  )
}

export const rewriteSnapshots = (kv: KVNamespace, snapshots: readonly Snapshot[]) =>
  Promise.all(
    snapshots.map((snapshot) =>
      kv.put(snapshotKey(snapshot.pageId, snapshot.locale), JSON.stringify(snapshot))
    )
  )

export const removeSnapshots = async (
  kv: KVNamespace,
  pageId: string,
  locales: readonly string[]
) => {
  const routes = routeKeysOf(await readSnapshots(kv, pageId, locales))
  await Promise.all(snapshotKeysOf(pageId, locales).map((key) => kv.delete(key)))
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
