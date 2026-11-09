import {
  LOCALES,
  routeKey,
  snapshotKey,
  snapshotSchema,
  type Locale,
  type Snapshot
} from '@studiobimo/backstage'

import type { Route } from './routing'

async function readSnapshot(kv: KVNamespace, pageId: string, locale: Locale) {
  const parsed = snapshotSchema.safeParse(
    await kv.get(snapshotKey(pageId, locale), { type: 'json' })
  )
  return parsed.success ? parsed.data : null
}

export async function findPublished(kv: KVNamespace, { locale, slug }: Route) {
  const pageId = await kv.get(routeKey(locale, slug))
  if (!pageId) return null
  const snapshot = await readSnapshot(kv, pageId, locale)
  return snapshot?.slug === slug ? snapshot : null
}

export async function findTranslations(kv: KVNamespace, snapshot: Snapshot) {
  const others = LOCALES.filter((locale) => locale !== snapshot.locale)
  const found = await Promise.all(others.map((locale) => readSnapshot(kv, snapshot.pageId, locale)))
  return found.filter((translation) => translation !== null)
}
