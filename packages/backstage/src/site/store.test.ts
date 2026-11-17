import { afterEach, describe, expect, it } from 'vitest'

import { NO_REFERENCES } from '../references.ts'
import {
  SITE_VERSION,
  SNAPSHOT,
  SNAPSHOT_UPGRADES,
  routeKey,
  snapshotKey,
  type Snapshot
} from '../publishing.ts'
import { SITE_SNAPSHOT, siteSnapshotKey, type SiteSnapshot } from '../site-publishing.ts'
import { routeOf } from './routing.ts'
import {
  findPublished,
  findSiteSnapshot,
  findTranslations,
  readSiteVersion,
  type KvReader
} from './store.ts'

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
  ...NO_REFERENCES,
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

  it('looks only for the locales the site serves', async () => {
    expect(await findTranslations(published, en, ['en'])).toEqual([])
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

describe('reading a page published in the previous snapshot format', () => {
  const PREVIOUS_FORMAT = SNAPSHOT.format - 1
  const { title, ...rest } = en
  const previous = { ...rest, format: PREVIOUS_FORMAT, heading: title }
  const kv = memoryKv({ [routeKey('en', 'about')]: 'p1', [snapshotKey('p1', 'en')]: previous })

  afterEach(() => {
    delete SNAPSHOT_UPGRADES[PREVIOUS_FORMAT]
  })

  it('serves it through the upgrade registered for that format', async () => {
    SNAPSHOT_UPGRADES[PREVIOUS_FORMAT] = ({ heading, ...stored }) => ({ ...stored, title: heading })
    expect(await findPublished(kv, { locale: 'en', slug: 'about' })).toEqual(en)
  })

  it('answers not found for a format that has no upgrade', async () => {
    expect(await findPublished(kv, { locale: 'en', slug: 'about' })).toBeNull()
  })
})

describe('reading the publish version', () => {
  it('returns the stored version, or undefined before any publish', async () => {
    const kvWith = (records: Record<string, string>) =>
      ({ get: async (key: string) => records[key] ?? null }) as KvReader
    expect(await readSiteVersion(kvWith({ [SITE_VERSION.key]: 'abc' }))).toBe('abc')
    expect(await readSiteVersion(kvWith({}))).toBeUndefined()
  })
})
