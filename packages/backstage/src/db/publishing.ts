import { and, asc, count, eq, gt, inArray, isNotNull, lt, sql } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { AdminRegistry } from '../collections.ts'
import type { PageBlock } from '../pages.ts'
import {
  entryRefsOf,
  referenceFieldsIn,
  resolveReferences,
  type PageEntryRef
} from '../references.ts'
import {
  buildSnapshots,
  checkBlocks,
  entriesForLocale,
  mediaFor,
  referencedMediaIds,
  type PublishDraft,
  type PublishMediaRow,
  type PublishProblem,
  type Snapshot
} from '../publishing.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { RepublishEntry, RepublishScope } from '../republish.ts'
import { SEO, type PublishedIndex, type PublishedPage } from '../seo.ts'
import { clearEntryRefs, readPublishedEntries, replaceEntryRefs } from './entry-references.ts'
import { media, pageBlocks, pageLocales, pages } from './schema.ts'

export const PUBLISH_PLAN = {
  ready: 'ready',
  notFound: 'not_found',
  stale: 'stale',
  invalid: 'invalid'
} as const

export type PublishPlan =
  | { status: typeof PUBLISH_PLAN.ready; snapshots: Snapshot[]; refs: PageEntryRef[] }
  | { status: typeof PUBLISH_PLAN.notFound }
  | { status: typeof PUBLISH_PLAN.stale }
  | { status: typeof PUBLISH_PLAN.invalid; problems: PublishProblem[] }

const readDraft = async (d1: AnyD1Database, id: string): Promise<PublishDraft | null> => {
  const db = drizzle(d1)
  const [[page], locales, blocks] = await Promise.all([
    db.select().from(pages).where(eq(pages.id, id)),
    db.select().from(pageLocales).where(eq(pageLocales.pageId, id)),
    db.select().from(pageBlocks).where(eq(pageBlocks.pageId, id)).orderBy(asc(pageBlocks.position))
  ])
  if (!page) return null
  return {
    page: { id, isHome: page.isHome, layout: page.layout, version: page.version },
    locales,
    blocks: blocks.map(({ id: blockId, block, schemaVersion, content }): PageBlock => ({
      id: blockId,
      block,
      schemaVersion,
      content: content as PageBlock['content']
    }))
  }
}

export const readMedia = async (d1: AnyD1Database, ids: string[]) => {
  if (ids.length === 0) return new Map<string, PublishMediaRow>()
  const rows = await drizzle(d1).select().from(media).where(inArray(media.id, ids))
  return new Map(rows.map((row) => [row.id, row]))
}

const resolveBlockReferences = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  blocks: readonly PageBlock[]
) => {
  const fields = blocks.flatMap(({ id, block, content }) =>
    referenceFieldsIn(registry.jsonSchema(block), id, content)
  )
  return {
    fields,
    resolved: resolveReferences(fields, await readPublishedEntries(d1, registry, fields))
  }
}

const planDraft = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  draft: PublishDraft,
  publishedAt: number
): Promise<PublishPlan> => {
  const { blocks } = checkBlocks(registry, draft.blocks)
  const { fields, resolved } = await resolveBlockReferences(d1, registry, blocks)
  const mediaRows = await readMedia(
    d1,
    referencedMediaIds(registry, blocks, draft.locales, resolved)
  )
  const built = buildSnapshots(registry, draft, mediaRows, publishedAt, resolved)
  return built.ok
    ? { status: PUBLISH_PLAN.ready, snapshots: built.snapshots, refs: entryRefsOf(fields) }
    : { status: PUBLISH_PLAN.invalid, problems: built.problems }
}

export const refreshSnapshots = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  snapshots: readonly Snapshot[]
): Promise<Snapshot[]> => {
  const [first] = snapshots
  if (!first) return []
  const blocks = first.blocks.filter(({ block }) => registry.get(block))
  const { resolved } = await resolveBlockReferences(d1, registry, blocks)
  const { defaultLocale } = resolveLocaleConfig(registry)
  const socialImageIds = snapshots.flatMap(({ seo }) => seo.socialImageId ?? [])
  const mediaIds = [
    ...new Set([...referencedMediaIds(registry, blocks, [], resolved), ...socialImageIds])
  ]
  const mediaRows = await readMedia(d1, mediaIds)
  return snapshots.map((snapshot) => ({
    ...snapshot,
    references: resolved.references,
    entries: entriesForLocale(registry, resolved, snapshot.locale, defaultLocale),
    media: mediaFor(mediaIds, mediaRows, snapshot.locale)
  }))
}

export const planPublish = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  id: string,
  expectedVersion: number,
  publishedAt: number
): Promise<PublishPlan> => {
  const draft = await readDraft(d1, id)
  if (!draft) return { status: PUBLISH_PLAN.notFound }
  if (draft.page.version !== expectedVersion) return { status: PUBLISH_PLAN.stale }
  return planDraft(d1, registry, draft, publishedAt)
}

export const planPreview = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  id: string,
  now: number
): Promise<PublishPlan> => {
  const draft = await readDraft(d1, id)
  return draft ? planDraft(d1, registry, draft, now) : { status: PUBLISH_PLAN.notFound }
}

export const recordPublished = async (
  d1: AnyD1Database,
  id: string,
  editorId: string,
  publishedAt: number,
  publishedVersion: number,
  refs: readonly PageEntryRef[]
) => {
  const db = drizzle(d1)
  await db
    .update(pages)
    .set({ publishedAt, publishedVersion, publishedBy: editorId, updatedAt: pages.updatedAt })
    .where(eq(pages.id, id))
  await replaceEntryRefs(d1, id, refs)
}

export const recordUnpublished = async (d1: AnyD1Database, id: string) => {
  const db = drizzle(d1)
  const cleared = await db
    .update(pages)
    .set({
      publishedAt: null,
      publishedVersion: null,
      publishedBy: null,
      updatedAt: pages.updatedAt
    })
    .where(eq(pages.id, id))
    .returning({ id: pages.id })
  await clearEntryRefs(d1, id)
  return cleared.length > 0
}

export const readPublishedIndex = async (d1: AnyD1Database): Promise<PublishedIndex> => {
  const rows = await drizzle(d1)
    .select({
      pageId: pages.id,
      isHome: pages.isHome,
      publishedAt: pages.publishedAt,
      locale: pageLocales.locale,
      slug: pageLocales.slug
    })
    .from(pages)
    .leftJoin(pageLocales, eq(pageLocales.pageId, pages.id))
    .where(isNotNull(pages.publishedAt))
    .orderBy(asc(pages.publishedAt), asc(pages.id))
  const entries = new Map<string, PublishedPage>()
  for (const { pageId, isHome, publishedAt, locale, slug } of rows) {
    const entry = entries.get(pageId) ?? {
      pageId,
      isHome,
      publishedAt: publishedAt ?? 0,
      slugs: {}
    }
    if (locale) entry.slugs[locale] = slug
    entries.set(pageId, entry)
  }
  return { format: SEO.format, pages: [...entries.values()] }
}

const dependsOnEntry = ({ collection, entryId }: RepublishEntry) =>
  sql`${pages.id} IN (SELECT page_id FROM page_entry_refs WHERE collection = ${collection} AND (entry_id = ${entryId} OR entry_id IS NULL))`

const republishFilter = ({ since, cursor, entry }: RepublishScope) =>
  and(
    isNotNull(pages.publishedAt),
    entry ? dependsOnEntry(entry) : undefined,
    since === null || entry ? undefined : lt(pages.publishedAt, since),
    cursor === null ? undefined : gt(pages.id, cursor)
  )

export const readRepublishBatch = (d1: AnyD1Database, scope: RepublishScope, limit: number) =>
  drizzle(d1)
    .select({ id: pages.id, version: pages.version })
    .from(pages)
    .where(republishFilter(scope))
    .orderBy(asc(pages.id))
    .limit(limit)

export const countRepublishable = async (d1: AnyD1Database, scope: RepublishScope) => {
  const [row] = await drizzle(d1)
    .select({
      remaining: count(),
      changed: count(sql`CASE WHEN ${pages.publishedVersion} < ${pages.version} THEN 1 END`)
    })
    .from(pages)
    .where(republishFilter(scope))
  return { remaining: row?.remaining ?? 0, changed: row?.changed ?? 0 }
}
