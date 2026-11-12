import { LOCALE, type Locale } from '../locales.ts'
import { readableSnapshotSchema, routeKey, snapshotKey, type Snapshot } from '../publishing.ts'
import { siteSnapshotKey, siteSnapshotSchema } from '../site-publishing.ts'
import type { Route } from './routing.ts'

export interface KvReader {
  get(key: string): Promise<string | null>
  get(key: string, options: { type: 'json' }): Promise<unknown>
}

async function readSnapshot(kv: KvReader, pageId: string, locale: Locale) {
  const parsed = readableSnapshotSchema.safeParse(
    await kv.get(snapshotKey(pageId, locale), { type: 'json' })
  )
  return parsed.success ? parsed.data : null
}

export async function findPublished(kv: KvReader, { locale, slug }: Route) {
  const pageId = await kv.get(routeKey(locale, slug))
  if (!pageId) return null
  const snapshot = await readSnapshot(kv, pageId, locale)
  return snapshot?.slug === slug ? snapshot : null
}

export async function findTranslations(
  kv: KvReader,
  snapshot: Snapshot,
  locales: readonly Locale[] = LOCALE.default.locales
) {
  const others = locales.filter((locale) => locale !== snapshot.locale)
  const found = await Promise.all(others.map((locale) => readSnapshot(kv, snapshot.pageId, locale)))
  return found.filter((translation) => translation !== null)
}

export async function findSiteSnapshot(kv: KvReader, locale: Locale) {
  const parsed = siteSnapshotSchema.safeParse(
    await kv.get(siteSnapshotKey(locale), { type: 'json' })
  )
  return parsed.success ? parsed.data : null
}
