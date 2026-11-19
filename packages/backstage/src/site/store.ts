import type { z } from 'zod'

import type { FormRegistry } from '../blocks.ts'
import type { CollectionRoute } from '../entry-pages.ts'
import {
  entryRouteKey,
  entrySnapshotKey,
  entrySnapshotSchema,
  type EntrySnapshot
} from '../entry-publishing.ts'
import { formProjectionKey, formProjectionSchema, publicFieldsOf } from '../form-projection.ts'
import { LOCALE, type Locale } from '../locales.ts'
import { isPreviewExpired, isPreviewToken, pagePreviewSchema, previewKey } from '../page-preview.ts'
import {
  readableSnapshotSchema,
  routeKey,
  SITE_VERSION,
  snapshotKey,
  type Snapshot
} from '../publishing.ts'
import { siteSnapshotKey, siteSnapshotSchema } from '../site-publishing.ts'
import type { EntryRoute, Route } from './routing.ts'

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

export const readSiteVersion = async (kv: KvReader) => (await kv.get(SITE_VERSION.key)) ?? undefined

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

export async function findRegistrySettings<S extends z.ZodType>(
  kv: KvReader,
  { settings }: { settings: S },
  locale: Locale
): Promise<z.output<S> | null> {
  const snapshot = await findSiteSnapshot(kv, locale)
  const parsed = settings.safeParse(snapshot?.settings)
  return parsed.success ? parsed.data : null
}

export async function findPagePreview(kv: KvReader, token: string, now = Date.now()) {
  if (!isPreviewToken(token)) return null
  const parsed = pagePreviewSchema.safeParse(await kv.get(previewKey(token), { type: 'json' }))
  return parsed.success && !isPreviewExpired(parsed.data, now) ? parsed.data : null
}

async function readEntrySnapshot(
  kv: KvReader,
  collection: string,
  entryId: string,
  locale: Locale
) {
  const parsed = entrySnapshotSchema.safeParse(
    await kv.get(entrySnapshotKey(collection, entryId, locale), { type: 'json' })
  )
  return parsed.success ? parsed.data : null
}

export async function findPublishedEntry(
  kv: KvReader,
  { collection, locale, slug }: EntryRoute,
  route: CollectionRoute
) {
  const entryId = await kv.get(entryRouteKey(locale, route, slug))
  if (!entryId) return null
  const snapshot = await readEntrySnapshot(kv, collection, entryId, locale)
  return snapshot?.slug === slug && snapshot.collection === collection ? snapshot : null
}

export async function findEntryTranslations(
  kv: KvReader,
  snapshot: EntrySnapshot,
  locales: readonly Locale[] = LOCALE.default.locales
) {
  const others = locales.filter((locale) => locale !== snapshot.locale)
  const found = await Promise.all(
    others.map((locale) => readEntrySnapshot(kv, snapshot.collection, snapshot.entryId, locale))
  )
  return found.filter((translation) => translation !== null)
}

type FormOf<R extends FormRegistry, N extends string> =
  R extends FormRegistry<infer F> ? Extract<F[number], { name: N }> : never

export interface FormProjectionRead<S extends z.ZodType = z.ZodType> {
  publishedAt: number
  entries: Partial<z.output<S>>[]
}

export async function findFormProjection<R extends FormRegistry, const N extends string>(
  kv: KvReader,
  registry: R,
  name: N
): Promise<FormProjectionRead<FormOf<R, N>['schema']> | null> {
  const form = registry.getForm(name)
  if (!form) return null
  const parsed = formProjectionSchema.safeParse(
    await kv.get(formProjectionKey(name), { type: 'json' })
  )
  if (!parsed.success || parsed.data.form !== name) return null
  return {
    publishedAt: parsed.data.publishedAt,
    entries: parsed.data.entries.map((entry) => publicFieldsOf(form, entry))
  } as FormProjectionRead<FormOf<R, N>['schema']>
}
