import { and, asc, desc, eq, getTableColumns, inArray, isNotNull } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { schemaNodeOf, validateBlockContent } from '../blocks.ts'
import { collectionsOf, type AdminRegistry, type Collection } from '../collections.ts'
import {
  referenceNeedsOf,
  type PageEntryRef,
  type PublishedEntries,
  type PublishedEntry,
  type ReferenceField,
  type ReferenceNeeds
} from '../references.ts'
import type { SchemaNode } from '../field-shapes.ts'
import { D1_LIMITS, inChunks } from './chunks.ts'
import { readPublishedEntrySlugs } from './entry-slugs.ts'
import { entries, pageEntryRefs } from './schema.ts'

const LOOKUP = { idsPerQuery: D1_LIMITS.boundParameters - 2 } as const

const REFS_INSERT = {
  rowsPerStatement: Math.floor(
    D1_LIMITS.boundParameters / Object.keys(getTableColumns(pageEntryRefs)).length
  )
} as const

const publishedIn = (collection: Collection) =>
  and(
    eq(entries.collection, collection.name),
    isNotNull(entries.publishedAt),
    isNotNull(entries.publishedContent)
  )

const publishedColumns = {
  id: entries.id,
  schemaVersion: entries.publishedSchemaVersion,
  content: entries.publishedContent
}

type PublishedRow = { id: string; schemaVersion: number | null; content: unknown }

const openRow = (collection: Collection, row: PublishedRow): PublishedEntry[] => {
  const opened = validateBlockContent(collection, row.schemaVersion ?? 1, row.content)
  return opened.ok
    ? [{ id: row.id, schemaVersion: opened.schemaVersion, content: opened.content }]
    : []
}

const readChosen = async (d1: AnyD1Database, collection: Collection, ids: readonly string[]) =>
  (
    await Promise.all(
      inChunks([...new Set(ids)], LOOKUP.idsPerQuery).map((chunk) =>
        drizzle(d1)
          .select(publishedColumns)
          .from(entries)
          .where(and(publishedIn(collection), inArray(entries.id, chunk)))
      )
    )
  )
    .flat()
    .flatMap((row) => openRow(collection, row))

const readLatest = async (d1: AnyD1Database, collection: Collection, count: number) =>
  count === 0
    ? []
    : (
        await drizzle(d1)
          .select(publishedColumns)
          .from(entries)
          .where(publishedIn(collection))
          .orderBy(desc(entries.publishedAt), desc(entries.id))
          .limit(count)
      ).flatMap((row) => openRow(collection, row))

export const readAllPublished = async (d1: AnyD1Database, collection: Collection) =>
  (
    await drizzle(d1)
      .select(publishedColumns)
      .from(entries)
      .where(publishedIn(collection))
      .orderBy(asc(entries.position), asc(entries.createdAt), asc(entries.id))
  ).flatMap((row) => openRow(collection, row))

const enumOrdersOf = (collection: Collection): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries((schemaNodeOf(collection.schema) as SchemaNode).properties ?? {}).flatMap(
      ([field, node]) => {
        const options = typeof node === 'object' ? node.enum : undefined
        return Array.isArray(options)
          ? [[field, options.filter((option): option is string => typeof option === 'string')]]
          : []
      }
    )
  )

const readSlugsOf = async (d1: AnyD1Database, collection: string, ids: string[]) =>
  new Map(
    (
      await Promise.all(
        inChunks(ids, LOOKUP.idsPerQuery).map((chunk) =>
          readPublishedEntrySlugs(d1, collection, chunk)
        )
      )
    ).flatMap((byEntry) => [...byEntry])
  )

const publishedSlugsOf = (slugs: Record<string, string | null> | undefined) =>
  Object.fromEntries(
    Object.entries(slugs ?? {}).flatMap(([locale, slug]) => (slug ? [[locale, slug]] : []))
  )

const readPool = async (
  d1: AnyD1Database,
  collection: Collection,
  { ids, latest, query }: ReferenceNeeds
) => {
  const [chosen, newest, queried] = await Promise.all([
    readChosen(d1, collection, ids),
    readLatest(d1, collection, latest),
    query ? readAllPublished(d1, collection) : Promise.resolve([])
  ])
  const everyone = [...chosen, ...newest, ...queried]
  const slugs = collection.route
    ? await readSlugsOf(d1, collection.name, [...new Set(everyone.map(({ id }) => id))])
    : new Map<string, Record<string, string | null>>()
  const withSlugs = (entry: PublishedEntry): PublishedEntry => {
    const own = publishedSlugsOf(slugs.get(entry.id))
    return Object.keys(own).length > 0 ? { ...entry, slugs: own } : entry
  }
  return {
    byId: new Map(everyone.map((entry) => [entry.id, withSlugs(entry)])),
    latest: newest.map(withSlugs),
    query: {
      entries: queried.map(withSlugs),
      groupOrders: query ? enumOrdersOf(collection) : {},
      keyField: collection.key
    }
  }
}

export const readPublishedEntries = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  fields: readonly ReferenceField[]
): Promise<PublishedEntries> => {
  const known = collectionsOf(registry)
  const pools = await Promise.all(
    [...referenceNeedsOf(fields)].flatMap(([name, needs]) => {
      const collection = known.get(name)
      return collection
        ? [readPool(d1, collection, needs).then((pool) => [name, pool] as const)]
        : []
    })
  )
  return new Map(pools)
}

export const replaceEntryRefs = (
  d1: AnyD1Database,
  pageId: string,
  refs: readonly PageEntryRef[]
) => {
  const db = drizzle(d1)
  return db.batch([
    db.delete(pageEntryRefs).where(eq(pageEntryRefs.pageId, pageId)),
    ...inChunks(refs, REFS_INSERT.rowsPerStatement).map((chunk) =>
      db
        .insert(pageEntryRefs)
        .values(chunk.map(({ collection, entryId }) => ({ pageId, collection, entryId })))
    )
  ])
}

export const clearEntryRefs = async (d1: AnyD1Database, pageId: string) => {
  await drizzle(d1).delete(pageEntryRefs).where(eq(pageEntryRefs.pageId, pageId))
}
