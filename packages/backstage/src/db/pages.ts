import { and, asc, eq, inArray } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import {
  LOCALES,
  pageSlugsOf,
  type Locale,
  type LocaleSeo,
  type Page,
  type PageBlock,
  type PageInput,
  type PageSeo,
  type PageStamp
} from '../pages.ts'
import { upgradeBlockContent, type Registry } from '../blocks.ts'
import {
  countMissingTranslations,
  isSeoMissing,
  type MissingByLocale,
  type TranslatedNode
} from '../translations.ts'
import { media, pageBlocks, pageLocales, pages, users } from './schema.ts'

type Database = ReturnType<typeof drizzle>

export const PAGE_WRITE = {
  ok: 'ok',
  slugTaken: 'slug_taken',
  homeTaken: 'home_taken',
  notFound: 'not_found',
  homeMismatch: 'home_mismatch',
  stale: 'stale',
  unknownMedia: 'unknown_media'
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
    db
      .select({ page: pages, publisherName: users.name, publisherEmail: users.email })
      .from(pages)
      .leftJoin(users, eq(users.id, pages.publishedBy))
      .orderBy(pages.createdAt),
    db.select().from(pageLocales)
  ])
  return rows.map(({ page: row, publisherName, publisherEmail }) => ({
    id: row.id,
    isHome: row.isHome,
    version: row.version,
    layout: row.layout,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedAt ? publisherName || publisherEmail || null : null,
    locales: locales
      .filter((locale) => locale.pageId === row.id)
      .map(({ locale, slug, title }) => ({ locale, slug, title }))
  }))
}

const seoFromRows = (
  rows: { locale: string; seoTitle: string; description: string; socialImageId: string | null }[]
) =>
  Object.fromEntries(
    LOCALES.map((locale) => {
      const row = rows.find((candidate) => candidate.locale === locale)
      return [
        locale,
        {
          title: row?.seoTitle ?? '',
          description: row?.description ?? '',
          socialImageId: row?.socialImageId ?? null
        }
      ]
    })
  ) as PageSeo

const toPageBlock = ({
  id,
  block,
  schemaVersion,
  content
}: typeof pageBlocks.$inferSelect): PageBlock => ({
  id,
  block,
  schemaVersion,
  content: content as PageBlock['content']
})

const blocksMissing = (
  registry: Registry,
  schemaOf: (block: string) => TranslatedNode,
  blocks: PageBlock[],
  locale: Locale
) =>
  blocks.reduce((total, { block, schemaVersion, content }) => {
    const definition = registry.get(block)
    const upgraded = definition && upgradeBlockContent(definition, schemaVersion, content)
    return upgraded?.ok
      ? total + countMissingTranslations(schemaOf(block), upgraded.content, locale)
      : total
  }, 0)

const memoizedSchemas = (registry: Registry) => {
  const cache = new Map<string, TranslatedNode>()
  return (block: string) => {
    const cached = cache.get(block) ?? registry.jsonSchema(block)
    cache.set(block, cached)
    return cached
  }
}

export const listMissingTranslations = async (
  d1: AnyD1Database,
  registry: Registry
): Promise<Map<string, MissingByLocale>> => {
  const db = connect(d1)
  const [locales, blocks] = await Promise.all([
    db.select().from(pageLocales),
    db.select().from(pageBlocks).orderBy(asc(pageBlocks.position))
  ])
  const pageIds = new Set(locales.map(({ pageId }) => pageId))
  const schemaOf = memoizedSchemas(registry)
  return new Map(
    [...pageIds].map((pageId) => {
      const seo = seoFromRows(locales.filter((row) => row.pageId === pageId))
      const own = blocks.filter((row) => row.pageId === pageId).map(toPageBlock)
      const missing = Object.fromEntries(
        LOCALES.map((locale) => [
          locale,
          blocksMissing(registry, schemaOf, own, locale) + (isSeoMissing(seo, locale) ? 1 : 0)
        ])
      ) as MissingByLocale
      return [pageId, missing]
    })
  )
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
      db
        .update(pages)
        .set({ version: existing.version + 1 })
        .where(eq(pages.id, id)),
      ...localeRows(id, input).map(({ locale, slug, title }) =>
        db
          .update(pageLocales)
          .set({ slug, title })
          .where(and(eq(pageLocales.pageId, id), eq(pageLocales.locale, locale)))
      )
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
  return rows.map(toPageBlock)
}

export interface VersionedWrite {
  expectedVersion: number
  editorId: string
}

const claimVersion = async (
  db: Database,
  id: string,
  { expectedVersion, editorId }: VersionedWrite,
  changes: { layout?: string } = {}
): Promise<PageWrite> => {
  const claimed = await db
    .update(pages)
    .set({ ...changes, version: expectedVersion + 1, updatedBy: editorId })
    .where(and(eq(pages.id, id), eq(pages.version, expectedVersion)))
    .returning({ id: pages.id })
  if (claimed.length > 0) return PAGE_WRITE.ok
  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id))
  return existing ? PAGE_WRITE.stale : PAGE_WRITE.notFound
}

export const readPageStamp = async (d1: AnyD1Database, id: string): Promise<PageStamp | null> => {
  const [row] = await connect(d1)
    .select({
      version: pages.version,
      updatedAt: pages.updatedAt,
      name: users.name,
      email: users.email
    })
    .from(pages)
    .leftJoin(users, eq(users.id, pages.updatedBy))
    .where(eq(pages.id, id))
  if (!row) return null
  return {
    version: row.version,
    updatedAt: row.updatedAt,
    updatedBy: row.name || row.email || null
  }
}

export const replacePageBlocks = async (
  d1: AnyD1Database,
  id: string,
  blocks: PageBlock[],
  write: VersionedWrite
) => {
  const db = connect(d1)
  const claimed = await claimVersion(db, id, write)
  if (claimed !== PAGE_WRITE.ok) return claimed
  const rows = blocks.map((block, position) => ({ ...block, pageId: id, position }))
  await db.batch([
    db.delete(pageBlocks).where(eq(pageBlocks.pageId, id)),
    ...(rows.length > 0 ? [db.insert(pageBlocks).values(rows)] : [])
  ])
  return PAGE_WRITE.ok
}

export const setPageLayout = (
  d1: AnyD1Database,
  id: string,
  layout: string,
  write: VersionedWrite
) => claimVersion(connect(d1), id, write, { layout })

export const readPageSeo = async (d1: AnyD1Database, id: string): Promise<PageSeo | undefined> => {
  const db = connect(d1)
  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id))
  if (!existing) return undefined
  const rows = await db.select().from(pageLocales).where(eq(pageLocales.pageId, id))
  return seoFromRows(rows)
}

const allMediaExists = async (db: Database, ids: string[]) => {
  if (ids.length === 0) return true
  const known = await db.select({ id: media.id }).from(media).where(inArray(media.id, ids))
  return new Set(ids).size === known.length
}

const localeSeoUpdate = (db: Database, id: string, locale: Locale, seo: LocaleSeo) =>
  db
    .update(pageLocales)
    .set({ seoTitle: seo.title, description: seo.description, socialImageId: seo.socialImageId })
    .where(and(eq(pageLocales.pageId, id), eq(pageLocales.locale, locale)))

export const writePageSeo = async (
  d1: AnyD1Database,
  id: string,
  seo: PageSeo,
  write: VersionedWrite
) => {
  const db = connect(d1)
  if (
    !(await allMediaExists(
      db,
      LOCALES.flatMap((locale) => seo[locale].socialImageId ?? [])
    ))
  ) {
    return PAGE_WRITE.unknownMedia
  }
  const claimed = await claimVersion(db, id, write)
  if (claimed !== PAGE_WRITE.ok) return claimed
  const [first, ...rest] = LOCALES.map((locale) => localeSeoUpdate(db, id, locale, seo[locale]))
  await db.batch([first!, ...rest])
  return PAGE_WRITE.ok
}
