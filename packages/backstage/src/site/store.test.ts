import { describe, expect, it } from 'vitest'

import { SNAPSHOT, routeKey, snapshotKey, type Snapshot } from '../publishing.ts'
import { SITE_SNAPSHOT, siteSnapshotKey, type SiteSnapshot } from '../site-publishing.ts'
import { routeOf } from './routing.ts'
import { findPublished, findSiteSnapshot, findTranslations, type KvReader } from './store.ts'

const snapshotOf = (locale: 'en' | 'es', slug: string | null): Snapshot => ({
  format: SNAPSHOT.format,
  pageId: 'p1',
  isHome: slug === null,
  slug,
  title: 'Page',
  layout: 'default',
  version: 1,
  publishedAt: 1,
  seo: { title: '', description: '', socialImageId: null },
  blocks: [],
  media: {},
  locale
})

const en = snapshotOf('en', 'about')
const es = snapshotOf('es', 'acerca')

const memoryKv = (entries: Record<string, unknown>): KvReader => ({
  get: (async (key: string, options?: { type: 'json' }) => {
    const value = entries[key]
    if (value === undefined) return null
    return options ? value : String(value)
  }) as KvReader['get']
})

const published = memoryKv({
  [routeKey('en', 'about')]: 'p1',
  [routeKey('es', 'acerca')]: 'p1',
  [snapshotKey('p1', 'en')]: en,
  [snapshotKey('p1', 'es')]: es
})

describe('reading published pages', () => {
  it('finds a page from a plain Request and a KV-shaped binding', async () => {
    const route = routeOf(new Request('https://example.com/about'))
    expect(route && (await findPublished(published, route))).toEqual(en)
  })

  it('finds nothing for an unpublished route', async () => {
    expect(await findPublished(published, { locale: 'en', slug: 'missing' })).toBeNull()
  })

  it('ignores a snapshot whose slug no longer matches its route', async () => {
    const stale = memoryKv({
      [routeKey('en', 'old')]: 'p1',
      [snapshotKey('p1', 'en')]: en
    })
    expect(await findPublished(stale, { locale: 'en', slug: 'old' })).toBeNull()
  })

  it('finds the other locales of a page', async () => {
    expect(await findTranslations(published, en)).toEqual([es])
  })
})

const siteEn: SiteSnapshot = {
  format: SITE_SNAPSHOT.format,
  locale: 'en',
  publishedAt: 1,
  siteName: 'Studio',
  seo: { description: '', socialImageId: null },
  slots: {},
  media: {}
}

describe('reading the published site', () => {
  it('finds the site snapshot of a locale', async () => {
    const kv = memoryKv({ [siteSnapshotKey('en')]: siteEn })
    expect(await findSiteSnapshot(kv, 'en')).toEqual(siteEn)
  })

  it('finds nothing for a locale not published, or for a snapshot in another shape', async () => {
    const kv = memoryKv({ [siteSnapshotKey('es')]: { format: 99 } })
    expect(await findSiteSnapshot(kv, 'en')).toBeNull()
    expect(await findSiteSnapshot(kv, 'es')).toBeNull()
  })
})
