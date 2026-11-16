import { and, eq, getTableColumns, isNull } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { D1_LIMITS, inChunks } from './chunks.ts'
import { pageLinkRefs } from './schema.ts'

const REFS_INSERT = {
  rowsPerStatement: Math.floor(
    D1_LIMITS.boundParameters / Object.keys(getTableColumns(pageLinkRefs)).length
  )
} as const

const ownerIs = (pageId: string | null) =>
  pageId === null ? isNull(pageLinkRefs.pageId) : eq(pageLinkRefs.pageId, pageId)

export const replacePageLinkRefs = (
  d1: AnyD1Database,
  pageId: string | null,
  targetPageIds: readonly string[]
) => {
  const db = drizzle(d1)
  return db.batch([
    db.delete(pageLinkRefs).where(ownerIs(pageId)),
    ...inChunks([...new Set(targetPageIds)], REFS_INSERT.rowsPerStatement).map((chunk) =>
      db.insert(pageLinkRefs).values(chunk.map((targetPageId) => ({ pageId, targetPageId })))
    )
  ])
}

export const clearPageLinkRefs = async (d1: AnyD1Database, pageId: string | null) => {
  await drizzle(d1).delete(pageLinkRefs).where(ownerIs(pageId))
}

export const siteLinksToPage = async (d1: AnyD1Database, targetPageId: string) => {
  const rows = await drizzle(d1)
    .select({ targetPageId: pageLinkRefs.targetPageId })
    .from(pageLinkRefs)
    .where(and(isNull(pageLinkRefs.pageId), eq(pageLinkRefs.targetPageId, targetPageId)))
    .limit(1)
  return rows.length > 0
}
