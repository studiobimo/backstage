import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineRegistry } from '../blocks.ts'
import { collectionSnapshotKey, collectionSnapshotOf } from '../collection-snapshot.ts'
import { defineCollection } from '../collections.ts'

import { NO_REFERENCES } from '../references.ts'
import {
  SITE_VERSION,
  SNAPSHOT,
  SNAPSHOT_UPGRADES,
  routeKey,
  snapshotKey,
  type Snapshot
} from '../publishing.ts'
import { NO_SITE_BRAND } from '../brand.ts'
import { SITE_SNAPSHOT, siteSnapshotKey, type SiteSnapshot } from '../site-publishing.ts'
import { routeOf } from './routing.ts'
import {
  findCollectionEntries,
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
  brand: NO_SITE_BRAND,
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

describe('reading a collection snapshot', () => {
  const seat = defineCollection({
    name: 'seat',
    label: 'code',
    snapshot: true,
    schema: z.object({ code: z.string(), capacity: z.number() })
  })
  const room = defineCollection({
    name: 'room',
    label: 'code',
    schema: z.object({ code: z.string() })
  })
  const registry = defineRegistry([], { collections: [seat, room] })
  const kv = memoryKv({
    [collectionSnapshotKey('seat')]: collectionSnapshotOf(
      'seat',
      [
        { id: 'a', content: { code: 'a1', capacity: 2 } },
        { id: 'b', content: { code: 'b1', capacity: 6 } },
        { id: 'c', content: { code: 'c1', capacity: 4 } }
      ],
      1
    ),
    [collectionSnapshotKey('room')]: collectionSnapshotOf('room', [{ id: 'r', content: {} }], 1)
  })

  it('lists the entries in their stored order', async () => {
    const found = await findCollectionEntries(kv, registry, 'seat')
    expect(found.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
  })

  it('filters, orders and limits', async () => {
    const found = await findCollectionEntries(kv, registry, 'seat', {
      where: { code: 'b1' }
    })
    expect(found).toEqual([{ id: 'b', content: { code: 'b1', capacity: 6 } }])
    const largest = await findCollectionEntries(kv, registry, 'seat', {
      orderBy: { field: 'capacity', direction: 'desc' },
      limit: 2
    })
    expect(largest.map(({ content }) => content.code)).toEqual(['b1', 'c1'])
  })

  it('answers an empty list for a missing key, an unknown name or a collection without snapshot', async () => {
    expect(await findCollectionEntries(memoryKv({}), registry, 'seat')).toEqual([])
    expect(await findCollectionEntries(kv, registry, 'room')).toEqual([])
  })
})
