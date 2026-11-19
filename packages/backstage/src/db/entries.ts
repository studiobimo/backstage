import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { openStoredContent } from '../blocks.ts'
import type { Collection, EntryLabels } from '../collections.ts'
import type { Entry } from '../entries.ts'
import type { EntrySlugs } from '../entry-snapshot-build.ts'
import { D1_LIMITS, inChunks } from './chunks.ts'
import { entrySlugWrites, readEntrySlugs, writeEntrySlugs } from './entry-slugs.ts'
import { entries, users } from './schema.ts'
import { ROW_WRITE, readStamp, type VersionedWrite } from './versioned-row.ts'

export const ENTRY_WRITE = { ...ROW_WRITE, notFound: 'not_found' } as const

export type EntryWrite = (typeof ENTRY_WRITE)[keyof typeof ENTRY_WRITE]

const updaters = alias(users, 'updaters')
const publishers = alias(users, 'publishers')

const personOf = (person: { name: string | null; email: string | null }) =>
  person.name || person.email || null

const readEntryRows = (d1: AnyD1Database, collection: string, id?: string) =>
  drizzle(d1)
    .select({
      entry: entries,
      updater: { name: updaters.name, email: updaters.email },
      publisher: { name: publishers.name, email: publishers.email }
    })
    .from(entries)
    .leftJoin(updaters, eq(updaters.id, entries.updatedBy))
    .leftJoin(publishers, eq(publishers.id, entries.publishedBy))
    .where(
      id === undefined
        ? eq(entries.collection, collection)
        : and(eq(entries.collection, collection), eq(entries.id, id))
    )
    .orderBy(desc(entries.updatedAt), desc(entries.id))

type EntryRow = Awaited<ReturnType<typeof readEntryRows>>[number]

const toEntry = (
  collection: Collection,
  { entry, updater, publisher }: EntryRow,
  slugs: EntrySlugs = {}
): Entry => {
  const opened = openStoredContent(collection, entry.schemaVersion, entry.content)
  return {
    id: entry.id,
    collection: entry.collection,
    version: entry.version,
    schemaVersion: opened.schemaVersion,
    label: entry.label,
    position: entry.position,
    slugs,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    updatedBy: updater ? personOf(updater) : null,
    publishedAt: entry.publishedAt,
    publishedVersion: entry.publishedVersion,
    publishedBy: publisher ? personOf(publisher) : null,
    content: opened.content as Entry['content']
  }
}

const slugsOf = (d1: AnyD1Database, collection: Collection, ids?: string[]) =>
  collection.route
    ? readEntrySlugs(d1, collection.name, ids)
    : Promise.resolve(new Map<string, EntrySlugs>())

export const listEntries = async (d1: AnyD1Database, collection: Collection) => {
  const [rows, slugs] = await Promise.all([
    readEntryRows(d1, collection.name),
    slugsOf(d1, collection)
  ])
  return rows.map((row) => toEntry(collection, row, slugs.get(row.entry.id)))
}

export const readEntryLabels = async (d1: AnyD1Database, ids: readonly string[]) =>
  (
    await Promise.all(
      inChunks([...new Set(ids)], D1_LIMITS.boundParameters).map((chunk) =>
        drizzle(d1)
          .select({ id: entries.id, collection: entries.collection, label: entries.label })
          .from(entries)
          .where(inArray(entries.id, chunk))
      )
    )
  ).flat()

export const findEntry = async (d1: AnyD1Database, collection: Collection, id: string) => {
  const [[row], slugs] = await Promise.all([
    readEntryRows(d1, collection.name, id),
    slugsOf(d1, collection, [id])
  ])
  return row ? toEntry(collection, row, slugs.get(id)) : undefined
}

export const findEntrySlugs = async (d1: AnyD1Database, collection: Collection, id: string) =>
  (await slugsOf(d1, collection, [id])).get(id) ?? {}

export interface EntryContent {
  content: unknown
  labels: EntryLabels
  slugs?: EntrySlugs | null
}

const nextPosition = (collection: Collection) =>
  sql<number>`(SELECT COALESCE(MAX(${entries.position}) + 1, 0) FROM ${entries} WHERE ${entries.collection} = ${collection.name})`

export const createEntry = async (
  d1: AnyD1Database,
  collection: Collection,
  id: string,
  { content, labels, slugs }: EntryContent,
  editorId: string
) => {
  const db = drizzle(d1)
  await db.batch([
    db.insert(entries).values({
      id,
      collection: collection.name,
      schemaVersion: collection.version,
      content,
      label: labels,
      position: nextPosition(collection),
      createdBy: editorId,
      updatedBy: editorId
    }),
    ...(slugs ? entrySlugWrites(db, collection.name, id, slugs) : [])
  ])
}

const entryMatches = (collection: Collection, id: string) =>
  and(eq(entries.id, id), eq(entries.collection, collection.name))

const outcomeOf = async (
  d1: AnyD1Database,
  collection: Collection,
  id: string,
  changed: unknown[]
): Promise<EntryWrite> => {
  if (changed.length > 0) return ENTRY_WRITE.ok
  const [existing] = await drizzle(d1)
    .select({ id: entries.id })
    .from(entries)
    .where(entryMatches(collection, id))
  return existing ? ENTRY_WRITE.stale : ENTRY_WRITE.notFound
}

export const updateEntry = async (
  d1: AnyD1Database,
  collection: Collection,
  id: string,
  { content, labels, slugs }: EntryContent,
  { expectedVersion, editorId }: VersionedWrite
) => {
  const changed = await drizzle(d1)
    .update(entries)
    .set({
      content,
      label: labels,
      schemaVersion: collection.version,
      version: expectedVersion + 1,
      updatedAt: Date.now(),
      updatedBy: editorId
    })
    .where(and(entryMatches(collection, id), eq(entries.version, expectedVersion)))
    .returning({ id: entries.id })
  if (changed.length > 0 && slugs) await writeEntrySlugs(d1, collection.name, id, slugs)
  return outcomeOf(d1, collection, id, changed)
}

export const deleteEntry = async (d1: AnyD1Database, collection: Collection, id: string) => {
  const removed = await drizzle(d1)
    .delete(entries)
    .where(entryMatches(collection, id))
    .returning({ id: entries.id })
  return removed.length > 0 ? ENTRY_WRITE.ok : ENTRY_WRITE.notFound
}

export const REORDER = { ok: 'ok', unknownEntry: 'unknown_entry' } as const

export type ReorderOutcome = (typeof REORDER)[keyof typeof REORDER]

export const reorderEntries = async (
  d1: AnyD1Database,
  collection: Collection,
  ids: readonly string[]
): Promise<ReorderOutcome> => {
  const db = drizzle(d1)
  const existing = (
    await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.collection, collection.name))
      .orderBy(asc(entries.position), asc(entries.createdAt), asc(entries.id))
  ).map(({ id }) => id)
  const known = new Set(existing)
  const requested = [...new Set(ids)]
  if (!requested.every((id) => known.has(id))) return REORDER.unknownEntry
  const placed = new Set(requested)
  const ordered = [...requested, ...existing.filter((id) => !placed.has(id))]
  const [first, ...rest] = ordered.map((id, position) =>
    db.update(entries).set({ position }).where(entryMatches(collection, id))
  )
  if (first) await db.batch([first, ...rest])
  return REORDER.ok
}

export interface EntryPublication {
  expectedVersion: number
  editorId: string
  publishedAt: number
  publishedContent: unknown
  publishedSchemaVersion: number
}

export const recordEntryPublished = async (
  d1: AnyD1Database,
  collection: Collection,
  id: string,
  {
    expectedVersion,
    editorId,
    publishedAt,
    publishedContent,
    publishedSchemaVersion
  }: EntryPublication
) => {
  const changed = await drizzle(d1)
    .update(entries)
    .set({
      publishedAt,
      publishedVersion: expectedVersion,
      publishedBy: editorId,
      publishedContent,
      publishedSchemaVersion
    })
    .where(and(entryMatches(collection, id), eq(entries.version, expectedVersion)))
    .returning({ id: entries.id })
  return outcomeOf(d1, collection, id, changed)
}

export const recordEntryUnpublished = async (
  d1: AnyD1Database,
  collection: Collection,
  id: string
) => {
  const cleared = await drizzle(d1)
    .update(entries)
    .set({
      publishedAt: null,
      publishedVersion: null,
      publishedBy: null,
      publishedContent: null,
      publishedSchemaVersion: null
    })
    .where(entryMatches(collection, id))
    .returning({ id: entries.id })
  return cleared.length > 0 ? ENTRY_WRITE.ok : ENTRY_WRITE.notFound
}

export const readEntryStamp = (d1: AnyD1Database, id: string) =>
  readStamp(d1, entries, eq(entries.id, id))
