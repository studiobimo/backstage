import { asc, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { pageSlugsOf, type Page, type PageBlock, type PageInput } from '../pages.ts'
import { pageBlocks, pageLocales, pages } from './schema.ts'

type Database = ReturnType<typeof drizzle>

export const PAGE_WRITE = {
  ok: 'ok',
  slugTaken: 'slug_taken',
  homeTaken: 'home_taken',
  notFound: 'not_found',
  homeMismatch: 'home_mismatch'
} as const

export type PageWrite = (typeof PAGE_WRITE)[keyof typeof PAGE_WRITE]

const connect = (d1: AnyD1Database): Database => drizzle(d1)

const localeRows = (pageId: string, input: PageInput) =>
  pageSlugsOf(input).map((row) => ({ pageId, ...row }))

const isUniqueViolation = (error: unknown) => String(error).includes('UNIQUE')

const guardUnique = async (write: () => Promise<unknown>): Promise<PageWrite> => {
  try {
    await write()
    return PAGE_WRITE.ok
  } catch (error) {
    if (isUniqueViolation(error)) return PAGE_WRITE.slugTaken
    throw error
  }
}

export const listPages = async (d1: AnyD1Database): Promise<Page[]> => {
  const db = connect(d1)
  const [rows, locales] = await Promise.all([
    db.select().from(pages).orderBy(pages.createdAt),
    db.select().from(pageLocales)
  ])
  return rows.map((row) => ({
    id: row.id,
    isHome: row.isHome,
    version: row.version,
    layout: row.layout,
    updatedAt: row.updatedAt,
    locales: locales
      .filter((locale) => locale.pageId === row.id)
      .map(({ locale, slug, title }) => ({ locale, slug, title }))
  }))
}

export const findPage = async (d1: AnyD1Database, id: string) =>
  (await listPages(d1)).find((page) => page.id === id)

export const createPage = async (d1: AnyD1Database, input: PageInput, id: string) => {
  const db = connect(d1)
  if (input.isHome) {
    const existing = await db.select({ id: pages.id }).from(pages).where(eq(pages.isHome, true))
    if (existing.length > 0) return PAGE_WRITE.homeTaken
  }
  return guardUnique(() =>
    db.batch([
      db.insert(pages).values({ id, isHome: input.isHome }),
      db.insert(pageLocales).values(localeRows(id, input))
    ])
  )
}

export const renamePage = async (d1: AnyD1Database, id: string, input: PageInput) => {
  const db = connect(d1)
  const [existing] = await db.select().from(pages).where(eq(pages.id, id))
  if (!existing) return PAGE_WRITE.notFound
  if (existing.isHome !== input.isHome) return PAGE_WRITE.homeMismatch
  return guardUnique(() =>
    db.batch([
      db.delete(pageLocales).where(eq(pageLocales.pageId, id)),
      db.insert(pageLocales).values(localeRows(id, input)),
      db
        .update(pages)
        .set({ version: existing.version + 1 })
        .where(eq(pages.id, id))
    ])
  )
}

export const deletePage = async (d1: AnyD1Database, id: string) => {
  const removed = await connect(d1).delete(pages).where(eq(pages.id, id)).returning()
  return removed.length > 0 ? PAGE_WRITE.ok : PAGE_WRITE.notFound
}

export const listPageBlocks = async (d1: AnyD1Database, pageId: string): Promise<PageBlock[]> => {
  const rows = await connect(d1)
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(asc(pageBlocks.position))
  return rows.map(({ id, block, schemaVersion, content }) => ({
    id,
    block,
    schemaVersion,
    content: content as PageBlock['content']
  }))
}

export const replacePageBlocks = async (d1: AnyD1Database, id: string, blocks: PageBlock[]) => {
  const db = connect(d1)
  const [existing] = await db.select().from(pages).where(eq(pages.id, id))
  if (!existing) return PAGE_WRITE.notFound
  const rows = blocks.map((block, position) => ({ ...block, pageId: id, position }))
  await db.batch([
    db.delete(pageBlocks).where(eq(pageBlocks.pageId, id)),
    ...(rows.length > 0 ? [db.insert(pageBlocks).values(rows)] : []),
    db
      .update(pages)
      .set({ version: existing.version + 1 })
      .where(eq(pages.id, id))
  ])
  return PAGE_WRITE.ok
}

export const setPageLayout = async (d1: AnyD1Database, id: string, layout: string) => {
  const db = connect(d1)
  const [existing] = await db.select().from(pages).where(eq(pages.id, id))
  if (!existing) return PAGE_WRITE.notFound
  await db
    .update(pages)
    .set({ layout, version: existing.version + 1 })
    .where(eq(pages.id, id))
  return PAGE_WRITE.ok
}
