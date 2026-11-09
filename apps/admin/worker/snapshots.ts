import { snapshotKey, snapshotKeysOf, type Snapshot } from '@studiobimo/backstage'

export const writeSnapshots = (kv: KVNamespace, snapshots: readonly Snapshot[]) =>
  Promise.all(
    snapshots.map((snapshot) =>
      kv.put(snapshotKey(snapshot.pageId, snapshot.locale), JSON.stringify(snapshot))
    )
  )

export const removeSnapshots = (kv: KVNamespace, pageId: string) =>
  Promise.all(snapshotKeysOf(pageId).map((key) => kv.delete(key)))
