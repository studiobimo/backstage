import { asc, eq, inArray } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { Registry } from '../blocks.ts'
import type { PageBlock } from '../pages.ts'
import {
  buildSnapshots,
  checkBlocks,
  referencedMediaIds,
  type PublishDraft,
  type PublishMediaRow,
  type PublishProblem,
  type Snapshot,
  withSeoDefaults
} from '../publishing.ts'
import { readSiteSettings } from './settings.ts'
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

const readMedia = async (d1: AnyD1Database, ids: string[]) => {
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
  const found = await readDraft(d1, id)
  if (!found) return { status: PUBLISH_PLAN.notFound }
  const draft = { ...found, locales: withSeoDefaults(found.locales, await readSiteSettings(d1)) }
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
  publishedAt: number
) => {
  const db = drizzle(d1)
  await db
    .update(pages)
    .set({ publishedAt, publishedBy: editorId, updatedAt: pages.updatedAt })
    .where(eq(pages.id, id))
}

export const recordUnpublished = async (d1: AnyD1Database, id: string) => {
  const db = drizzle(d1)
  const cleared = await db
    .update(pages)
    .set({ publishedAt: null, publishedBy: null, updatedAt: pages.updatedAt })
    .where(eq(pages.id, id))
    .returning({ id: pages.id })
  return cleared.length > 0
}
