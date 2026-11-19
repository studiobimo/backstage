import { eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'

import type { MediaUsage } from '../media.ts'
import { entries, pageBlocks, pageLocales, siteBlocks, siteSettings } from './schema.ts'

const SITE_USAGE: MediaUsage = { kind: 'site', id: 'site', label: {} }

const mentions = (column: SQLiteColumn, id: string): SQL => sql`instr(${column}, ${id}) > 0`

const pagesUsing = async (d1: AnyD1Database, id: string): Promise<MediaUsage[]> => {
  const db = drizzle(d1)
  const inBlocks = db
    .select({ pageId: pageBlocks.pageId })
    .from(pageBlocks)
    .where(mentions(pageBlocks.content, id))
  const asSocialImage = db
    .select({ pageId: pageLocales.pageId })
    .from(pageLocales)
    .where(eq(pageLocales.socialImageId, id))
  const rows = await db
    .select({ pageId: pageLocales.pageId, locale: pageLocales.locale, title: pageLocales.title })
    .from(pageLocales)
    .where(or(inArray(pageLocales.pageId, inBlocks), inArray(pageLocales.pageId, asSocialImage)))
  const labels = new Map<string, Record<string, string>>()
  for (const { pageId, locale, title } of rows) {
    labels.set(pageId, { ...labels.get(pageId), [locale]: title })
  }
  return [...labels].map(([pageId, label]) => ({ kind: 'page', id: pageId, label }))
}

const entriesUsing = async (d1: AnyD1Database, id: string): Promise<MediaUsage[]> => {
  const rows = await drizzle(d1)
    .select({ id: entries.id, label: entries.label })
    .from(entries)
    .where(or(mentions(entries.content, id), mentions(entries.publishedContent, id)))
  return rows.map((row) => ({ kind: 'entry', ...row }))
}

const siteUses = async (d1: AnyD1Database, id: string) => {
  const db = drizzle(d1)
  const [settings, blocks] = await Promise.all([
    db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(mentions(siteSettings.content, id))
      .limit(1),
    db
      .select({ slot: siteBlocks.slot })
      .from(siteBlocks)
      .where(mentions(siteBlocks.content, id))
      .limit(1)
  ])
  return settings.length + blocks.length > 0
}

export const findMediaUsage = async (d1: AnyD1Database, id: string): Promise<MediaUsage[]> => {
  const [pages, entryUsage, site] = await Promise.all([
    pagesUsing(d1, id),
    entriesUsing(d1, id),
    siteUses(d1, id)
  ])
  return [...pages, ...entryUsage, ...(site ? [SITE_USAGE] : [])]
}
