import {
  routeKeysOf,
  snapshotKeysOf,
  snapshotRecords,
  snapshotSchema,
  type Snapshot
} from '@studiobimo/backstage'

export const writeSnapshots = (kv: KVNamespace, snapshots: readonly Snapshot[]) =>
  Promise.all(snapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))

const readSnapshots = async (kv: KVNamespace, pageId: string) =>
  (await Promise.all(snapshotKeysOf(pageId).map((key) => kv.get(key, { type: 'json' })))).flatMap(
    (stored) => {
      const parsed = snapshotSchema.safeParse(stored)
      return parsed.success ? [parsed.data] : []
    }
  )

export const removeSnapshots = async (kv: KVNamespace, pageId: string) => {
  const routes = routeKeysOf(await readSnapshots(kv, pageId))
  await Promise.all([...snapshotKeysOf(pageId), ...routes].map((key) => kv.delete(key)))
}
