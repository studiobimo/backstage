import { z } from 'zod'

import type { Collection } from './collections.ts'

const COLLECTION_SNAPSHOT = {
  format: 1,
  key: { prefix: 'collection', separator: ':' },
  writes: { perCollection: 1 }
} as const

export const collectionSnapshotKey = (collection: string) =>
  [COLLECTION_SNAPSHOT.key.prefix, collection].join(COLLECTION_SNAPSHOT.key.separator)

export const collectionSnapshotSchema = z.object({
  format: z.literal(COLLECTION_SNAPSHOT.format),
  collection: z.string(),
  publishedAt: z.number().int(),
  entries: z.array(z.object({ id: z.string(), content: z.json() }))
})
export type CollectionSnapshot = z.infer<typeof collectionSnapshotSchema>

export const hasSnapshot = (collection: Pick<Collection, 'snapshot'>) =>
  collection.snapshot === true

export const collectionSnapshotWrites = (collection: Pick<Collection, 'snapshot'>) =>
  hasSnapshot(collection) ? COLLECTION_SNAPSHOT.writes.perCollection : 0

export const collectionSnapshotOf = (
  collection: string,
  entries: readonly { id: string; content: unknown }[],
  publishedAt: number
): CollectionSnapshot => ({
  format: COLLECTION_SNAPSHOT.format,
  collection,
  publishedAt,
  entries: entries.map(({ id, content }) => ({
    id,
    content: content as CollectionSnapshot['entries'][number]['content']
  }))
})
