import type { AnyD1Database } from 'drizzle-orm/d1'

import {
  collectionSnapshotKey,
  collectionSnapshotOf,
  collectionSnapshotWrites,
  hasSnapshot
} from '../collection-snapshot.ts'
import { collectionsOf, type AdminRegistry, type Collection } from '../collections.ts'
import { readAllPublished } from '../db/entry-references.ts'

export const refreshCollectionSnapshot = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  collection: Collection,
  now = Date.now()
) => {
  if (!hasSnapshot(collection)) return
  const published = await readAllPublished(d1, collection)
  await kv.put(
    collectionSnapshotKey(collection.name),
    JSON.stringify(collectionSnapshotOf(collection.name, published, now))
  )
}

export const snapshotWritesOf = (registry: AdminRegistry) =>
  [...collectionsOf(registry).values()].reduce(
    (total, collection) => total + collectionSnapshotWrites(collection),
    0
  )

export const refreshCollectionSnapshots = (
  d1: AnyD1Database,
  kv: KVNamespace,
  registry: AdminRegistry
) =>
  Promise.all(
    [...collectionsOf(registry).values()].map((collection) =>
      refreshCollectionSnapshot(d1, kv, collection)
    )
  )
