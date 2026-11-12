import {
  EMPTY_PUBLISHED_INDEX,
  publishedIndexSchema,
  removeFromIndex,
  SEO,
  routeKeysOf,
  snapshotKeysOf,
  snapshotRecords,
  snapshotSchema,
  upsertIntoIndex,
  type PublishedIndex,
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

const readIndex = async (kv: KVNamespace): Promise<PublishedIndex> => {
  const parsed = publishedIndexSchema.safeParse(await kv.get(SEO.indexKey, 'json'))
  return parsed.success ? parsed.data : EMPTY_PUBLISHED_INDEX
}

const writeIndex = (kv: KVNamespace, index: PublishedIndex) =>
  kv.put(SEO.indexKey, JSON.stringify(index))

export const indexPublished = async (kv: KVNamespace, snapshots: readonly Snapshot[]) =>
  writeIndex(kv, upsertIntoIndex(await readIndex(kv), snapshots))

export const indexUnpublished = async (kv: KVNamespace, pageId: string) =>
  writeIndex(kv, removeFromIndex(await readIndex(kv), pageId))
