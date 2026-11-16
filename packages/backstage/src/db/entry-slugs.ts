import { and, eq, inArray, like, ne, or } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { EntryLabels } from '../collections.ts'
import { deriveEntrySlug, freeSlug } from '../entry-pages.ts'
import type { EntrySlugs } from '../entry-snapshot-build.ts'
import type { LocaleConfig } from '../locales.ts'
import { entryLocales } from './schema.ts'

type Database = ReturnType<typeof drizzle>

export const readEntrySlugs = async (d1: AnyD1Database, collection: string, ids?: string[]) => {
  const rows = await drizzle(d1)
    .select()
    .from(entryLocales)
    .where(
      ids
        ? and(eq(entryLocales.collection, collection), inArray(entryLocales.entryId, ids))
        : eq(entryLocales.collection, collection)
    )
  const byEntry = new Map<string, Record<string, string | null>>()
  for (const { entryId, locale, slug } of rows) {
    byEntry.set(entryId, { ...byEntry.get(entryId), [locale]: slug })
  }
  return byEntry
}

const takenSlugs = async (
  db: Database,
  collection: string,
  locale: string,
  base: string,
  entryId: string
) => {
  const rows = await db
    .select({ slug: entryLocales.slug })
    .from(entryLocales)
    .where(
      and(
        eq(entryLocales.collection, collection),
        eq(entryLocales.locale, locale),
        ne(entryLocales.entryId, entryId),
        or(eq(entryLocales.slug, base), like(entryLocales.slug, `${base}-%`))
      )
    )
  return new Set(rows.flatMap(({ slug }) => (slug ? [slug] : [])))
}

export interface SlugInputs {
  config: LocaleConfig
  labels: EntryLabels
  provided?: Readonly<Record<string, string>>
  existing?: EntrySlugs
}

export const resolveEntrySlugs = async (
  d1: AnyD1Database,
  collection: string,
  entryId: string,
  { config, labels, provided = {}, existing = {} }: SlugInputs
): Promise<EntrySlugs> => {
  const db = drizzle(d1)
  const resolved = await Promise.all(
    config.locales.map(async (locale): Promise<[string, string | null]> => {
      const kept = provided[locale] ?? existing[locale]
      if (kept) return [locale, kept]
      const base = deriveEntrySlug(labels, locale, config.defaultLocale)
      if (!base) return [locale, null]
      return [locale, freeSlug(base, await takenSlugs(db, collection, locale, base, entryId))]
    })
  )
  return Object.fromEntries(resolved)
}

export const slugsClash = async (
  d1: AnyD1Database,
  collection: string,
  entryId: string,
  slugs: EntrySlugs
) => {
  const wanted = Object.entries(slugs).flatMap(([locale, slug]) =>
    slug ? [and(eq(entryLocales.locale, locale), eq(entryLocales.slug, slug))] : []
  )
  if (wanted.length === 0) return false
  const found = await drizzle(d1)
    .select({ entryId: entryLocales.entryId })
    .from(entryLocales)
    .where(
      and(eq(entryLocales.collection, collection), ne(entryLocales.entryId, entryId), or(...wanted))
    )
    .limit(1)
  return found.length > 0
}

export const entrySlugWrites = (
  db: Database,
  collection: string,
  entryId: string,
  slugs: EntrySlugs
) =>
  Object.entries(slugs).map(([locale, slug]) =>
    db
      .insert(entryLocales)
      .values({ entryId, collection, locale, slug })
      .onConflictDoUpdate({
        target: [entryLocales.entryId, entryLocales.locale],
        set: { slug }
      })
  )

export const writeEntrySlugs = async (
  d1: AnyD1Database,
  collection: string,
  entryId: string,
  slugs: EntrySlugs
) => {
  const db = drizzle(d1)
  const [first, ...rest] = entrySlugWrites(db, collection, entryId, slugs)
  if (first) await db.batch([first, ...rest])
}
