import { and, asc, eq, exists, getTableColumns, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
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
  NO_MISSING,
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

const UNIQUE_VIOLATION = { marker: 'UNIQUE', homeColumn: 'pages.is_home' } as const

const uniqueOutcome = (error: unknown): PageWrite | null => {
  const message = String(error)
  if (!message.includes(UNIQUE_VIOLATION.marker)) return null
  return message.includes(UNIQUE_VIOLATION.homeColumn) ? PAGE_WRITE.homeTaken : PAGE_WRITE.slugTaken
}

const guardUnique = async (write: () => Promise<PageWrite>): Promise<PageWrite> => {
  try {
    return await write()
  } catch (error) {
    const outcome = uniqueOutcome(error)
    if (outcome) return outcome
    throw error
  }
}

const pageWithPublisher = (db: Database) =>
  db
    .select({ page: pages, publisherName: users.name, publisherEmail: users.email })
    .from(pages)
    .leftJoin(users, eq(users.id, pages.publishedBy))

const readPageRows = async (db: Database, id?: string) => {
  const [rows, locales] = await Promise.all([
    pageWithPublisher(db)
      .where(id === undefined ? undefined : eq(pages.id, id))
      .orderBy(pages.createdAt),
    db
      .select()
      .from(pageLocales)
      .where(id === undefined ? undefined : eq(pageLocales.pageId, id))
  ])
  return rows.map(({ page: row, publisherName, publisherEmail }) => ({
    stored: row.missingTranslations,
    page: {
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
    } satisfies Page
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

const missingOf = (
  registry: Registry,
  schemaOf: (block: string) => TranslatedNode,
  locales: (typeof pageLocales.$inferSelect)[],
  blocks: PageBlock[]
) => {
  const seo = seoFromRows(locales)
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      blocksMissing(registry, schemaOf, blocks, locale) + (isSeoMissing(seo, locale) ? 1 : 0)
    ])
  ) as MissingByLocale
}

const groupByPage = <Row extends { pageId: string }>(rows: Row[]) =>
  rows.reduce((groups, row) => {
    groups.set(row.pageId, [...(groups.get(row.pageId) ?? []), row])
    return groups
  }, new Map<string, Row[]>())

export const refreshMissingTranslations = async (
  d1: AnyD1Database,
  registry: Registry,
  pageId?: string
): Promise<Map<string, MissingByLocale>> => {
  const db = connect(d1)
  const scope = pageId === undefined ? isNull(pages.missingTranslations) : eq(pages.id, pageId)
  const [versions, locales, blocks] = await Promise.all([
    db.select({ id: pages.id, version: pages.version }).from(pages).where(scope),
    db
      .select(getTableColumns(pageLocales))
      .from(pageLocales)
      .innerJoin(pages, eq(pages.id, pageLocales.pageId))
      .where(scope),
    db
      .select(getTableColumns(pageBlocks))
      .from(pageBlocks)
      .innerJoin(pages, eq(pages.id, pageBlocks.pageId))
      .where(scope)
      .orderBy(asc(pageBlocks.position))
  ])
  const schemaOf = memoizedSchemas(registry)
  const localesByPage = groupByPage(locales)
  const blocksByPage = groupByPage(blocks)
  const computed = new Map(
    versions.map(({ id, version }) => [
      id,
      {
        version,
        missing: missingOf(
          registry,
          schemaOf,
          localesByPage.get(id) ?? [],
          (blocksByPage.get(id) ?? []).map(toPageBlock)
        )
      }
    ])
  )
  const [first, ...rest] = [...computed].map(([id, { version, missing }]) =>
    db
      .update(pages)
      .set({ missingTranslations: missing, updatedAt: pages.updatedAt })
      .where(and(eq(pages.id, id), eq(pages.version, version)))
  )
  if (first) await db.batch([first, ...rest])
  return new Map([...computed].map(([id, { missing }]) => [id, missing]))
}

export const listPageSummaries = async (d1: AnyD1Database, registry: Registry) => {
  const rows = await readPageRows(connect(d1))
  const needsCount = rows.some(({ stored }) => stored === null)
  const computed = needsCount ? await refreshMissingTranslations(d1, registry) : new Map()
  return rows.map(({ page, stored }) => ({
    ...page,
    missing: stored ?? computed.get(page.id) ?? NO_MISSING
  }))
}

export const findPage = async (d1: AnyD1Database, id: string) =>
  (await readPageRows(connect(d1), id))[0]?.page

export const createPage = async (d1: AnyD1Database, input: PageInput, id: string) => {
  const db = connect(d1)
  return guardUnique(async () => {
    await db.batch([
      db.insert(pages).values({ id, isHome: input.isHome }),
      db.insert(pageLocales).values(localeRows(id, input))
    ])
    return PAGE_WRITE.ok
  })
}

export const renamePage = async (
  d1: AnyD1Database,
  id: string,
  input: PageInput,
  write: VersionedWrite
) => {
  const db = connect(d1)
  const [existing] = await db.select().from(pages).where(eq(pages.id, id))
  if (!existing) return PAGE_WRITE.notFound
  if (existing.isHome !== input.isHome) return PAGE_WRITE.homeMismatch
  return guardUnique(() =>
    writeVersioned(db, id, write, {}, (versionMatches) =>
      localeRows(id, input).map(({ locale, slug, title }) =>
        db
          .update(pageLocales)
          .set({ slug, title })
          .where(and(eq(pageLocales.pageId, id), eq(pageLocales.locale, locale), versionMatches))
      )
    )
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

const versionMatches = (db: Database, id: string, expectedVersion: number) =>
  exists(
    db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.version, expectedVersion)))
  )

const INVALIDATE_MISSING = { missingTranslations: null } as const

type ContentWrites = (versionMatches: SQL) => BatchItem<'sqlite'>[]

const writeVersioned = async (
  db: Database,
  id: string,
  { expectedVersion, editorId }: VersionedWrite,
  changes: { layout?: string; missingTranslations?: null },
  contentWrites: ContentWrites
): Promise<PageWrite> => {
  const claim = db
    .update(pages)
    .set({ ...changes, version: expectedVersion + 1, updatedBy: editorId })
    .where(and(eq(pages.id, id), eq(pages.version, expectedVersion)))
    .returning({ id: pages.id })
  const statements = [...contentWrites(versionMatches(db, id, expectedVersion)), claim]
  const results = await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  if ((results.at(-1) as { id: string }[]).length > 0) return PAGE_WRITE.ok
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

const insertBlockIfMatched = (
  db: Database,
  pageId: string,
  { id, block, schemaVersion, content }: PageBlock,
  position: number,
  { expectedVersion }: VersionedWrite
) =>
  db.insert(pageBlocks).select(
    db
      .select({
        id: sql<string>`${id}`.as('id'),
        pageId: sql<string>`${pageId}`.as('page_id'),
        position: sql<number>`${position}`.as('position'),
        block: sql<string>`${block}`.as('block'),
        schemaVersion: sql<number>`${schemaVersion}`.as('schema_version'),
        content: sql<string>`${JSON.stringify(content)}`.as('content')
      })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.version, expectedVersion)))
  )

export const replacePageBlocks = async (
  d1: AnyD1Database,
  id: string,
  blocks: PageBlock[],
  write: VersionedWrite
) => {
  const db = connect(d1)
  return writeVersioned(db, id, write, INVALIDATE_MISSING, (matches) => [
    db.delete(pageBlocks).where(and(eq(pageBlocks.pageId, id), matches)),
    ...blocks.map((block, position) => insertBlockIfMatched(db, id, block, position, write))
  ])
}

export const setPageLayout = (
  d1: AnyD1Database,
  id: string,
  layout: string,
  write: VersionedWrite
) => writeVersioned(connect(d1), id, write, { layout }, () => [])

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

const localeSeoUpdate = (
  db: Database,
  id: string,
  locale: Locale,
  seo: LocaleSeo,
  versionMatches: SQL
) =>
  db
    .update(pageLocales)
    .set({ seoTitle: seo.title, description: seo.description, socialImageId: seo.socialImageId })
    .where(and(eq(pageLocales.pageId, id), eq(pageLocales.locale, locale), versionMatches))

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
  return writeVersioned(db, id, write, INVALIDATE_MISSING, (matches) =>
    LOCALES.map((locale) => localeSeoUpdate(db, id, locale, seo[locale], matches))
  )
}
