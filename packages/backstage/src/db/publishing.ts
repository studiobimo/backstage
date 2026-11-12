import { and, asc, count, eq, gt, inArray, isNotNull, lt, sql } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { Registry } from '../blocks.ts'
import { LOCALES, type PageBlock } from '../pages.ts'
import {
  buildSnapshots,
  checkBlocks,
  referencedMediaIds,
  type PublishDraft,
  type PublishMediaRow,
  type PublishProblem,
  type Snapshot
} from '../publishing.ts'
import type { RepublishScope } from '../republish.ts'
import { SEO, type PublishedIndex, type PublishedPage } from '../seo.ts'
import { media, pageBlocks, pageLocales, pages } from './schema.ts'

export const PUBLISH_PLAN = {
  ready: 'ready',
  notFound: 'not_found',
  stale: 'stale',
  invalid: 'invalid'
} as const

export type PublishPlan =
  | { status: typeof PUBLISH_PLAN.ready; snapshots: Snapshot[] }
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

export const planPublish = async (
  d1: AnyD1Database,
  registry: Registry,
  id: string,
  expectedVersion: number,
  publishedAt: number
): Promise<PublishPlan> => {
  const draft = await readDraft(d1, id)
  if (!draft) return { status: PUBLISH_PLAN.notFound }
  if (draft.page.version !== expectedVersion) return { status: PUBLISH_PLAN.stale }
  const { blocks } = checkBlocks(registry, draft.blocks)
  const mediaRows = await readMedia(d1, referencedMediaIds(registry, blocks, draft.locales))
  const built = buildSnapshots(registry, draft, mediaRows, publishedAt)
  return built.ok
    ? { status: PUBLISH_PLAN.ready, snapshots: built.snapshots }
    : { status: PUBLISH_PLAN.invalid, problems: built.problems }
}

export const recordPublished = async (
  d1: AnyD1Database,
  id: string,
  editorId: string,
  publishedAt: number,
  publishedVersion: number
) => {
  const db = drizzle(d1)
  await db
    .update(pages)
    .set({ publishedAt, publishedVersion, publishedBy: editorId, updatedAt: pages.updatedAt })
    .where(eq(pages.id, id))
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
  return cleared.length > 0
}

const emptySlugs = () =>
  Object.fromEntries(LOCALES.map((locale) => [locale, null])) as PublishedPage['slugs']

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
      slugs: emptySlugs()
    }
    if (locale && (LOCALES as readonly string[]).includes(locale)) {
      entry.slugs[locale as keyof PublishedPage['slugs']] = slug
    }
    entries.set(pageId, entry)
  }
  return { format: SEO.format, pages: [...entries.values()] }
}

const republishFilter = ({ since, cursor }: RepublishScope) =>
  and(
    isNotNull(pages.publishedAt),
    since === null ? undefined : lt(pages.publishedAt, since),
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
