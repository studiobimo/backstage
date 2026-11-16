import type { ReactNode } from 'react'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry, SLOT } from '../../blocks.ts'
import { defineComponents } from '../../components.ts'
import type { LocaleConfig } from '../../locales.ts'
import { SNAPSHOT, snapshotRecords, type Snapshot } from '../../publishing.ts'
import { EMPTY_PUBLISHED_INDEX, SEO, upsertIntoIndex } from '../../seo.ts'
import { SITE_SNAPSHOT, siteSnapshotKey, type SiteSnapshot } from '../../site-publishing.ts'
import type { SiteEnv } from '../index.ts'
import type { CreateSiteOptions } from './create-site.ts'

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
const header = defineBlock({ name: 'header', schema: z.object({ text: z.string() }) })

const registryFor = (locales: LocaleConfig) =>
  defineRegistry([note, header], {
    ...locales,
    slots: { [SLOT.header]: [header.name] },
    layouts: [defineLayout({ name: 'default' })]
  })

const Layout = ({ slots, children }: { slots: Record<string, ReactNode>; children: ReactNode }) => (
  <>
    <div data-slot-header>{slots[SLOT.header]}</div>
    <main>{children}</main>
  </>
)

export const FIXTURE = {
  stylesheet: 'body { margin: 0 }',
  adminOrigin: 'https://admin.example.com',
  siteUrl: 'https://example.com',
  thumbnail: '<svg id="note-thumbnail"/>',
  photo: '<svg id="photo"/>',
  mediaKey: 'media/m1.png'
} as const

const FIXTURE_LOCALES = { locales: ['en', 'es', 'fr'], defaultLocale: 'en' } as const

export const fixtureComponents = (locales: LocaleConfig = FIXTURE_LOCALES) =>
  defineComponents(registryFor(locales), {
    blocks: {
      note: ({ text }: { text: string }) => <p>{text}</p>,
      header: ({ text }: { text: string }) => <header>{text}</header>
    },
    layouts: { default: Layout }
  })

export const fixtureOptions = (overrides: Partial<CreateSiteOptions> = {}): CreateSiteOptions => ({
  components: fixtureComponents(),
  stylesheet: FIXTURE.stylesheet,
  preview: {
    samples: { note: { text: 'Sample note' } },
    media: {},
    thumbnails: { note: FIXTURE.thumbnail },
    assets: { 'block-previews/photo.svg': FIXTURE.photo }
  },
  ...overrides
})

export const pageSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  format: SNAPSHOT.format,
  pageId: 'p1',
  locale: 'en',
  isHome: false,
  slug: 'about',
  title: 'About',
  layout: 'default',
  version: 1,
  publishedAt: 1,
  seo: { title: '', description: '', socialImageId: null },
  blocks: [{ id: 'b1', block: 'note', schemaVersion: 1, content: { text: 'Hello there' } }],
  media: {},
  ...overrides
})

export const siteSnapshot = (overrides: Partial<SiteSnapshot> = {}): SiteSnapshot => ({
  format: SITE_SNAPSHOT.format,
  locale: 'en',
  publishedAt: 1,
  siteName: 'Studio',
  seo: { description: '', socialImageId: null },
  slots: { header: { block: 'header', schemaVersion: 1, content: { text: 'Studio header' } } },
  media: {},
  ...overrides
})

const publishedIndexOf = (snapshots: Snapshot[]) =>
  Object.values(Object.groupBy(snapshots, ({ pageId }) => pageId)).reduce(
    (index, group) => upsertIntoIndex(index, group ?? []),
    EMPTY_PUBLISHED_INDEX
  )

export const memoryKv = (
  snapshots: Snapshot[] = [],
  sites: SiteSnapshot[] = [],
  extra: Record<string, string> = {}
) => {
  const records = new Map<string, string>([
    [SEO.indexKey, JSON.stringify(publishedIndexOf(snapshots))],
    ...snapshotRecords(snapshots).map(({ key, value }): [string, string] => [key, value]),
    ...sites.map((site): [string, string] => [siteSnapshotKey(site.locale), JSON.stringify(site)]),
    ...Object.entries(extra)
  ])
  return {
    get: async (key: string, options?: { type: 'json' }) => {
      const value = records.get(key) ?? null
      return options && value ? JSON.parse(value) : value
    }
  }
}

export const envWith = (overrides: Partial<Record<keyof SiteEnv, unknown>> = {}, kv = memoryKv()) =>
  ({
    SITE: kv,
    MEDIA: { get: async () => null },
    SITE_URL: FIXTURE.siteUrl,
    ADMIN_ORIGIN: FIXTURE.adminOrigin,
    ...overrides
  }) as unknown as SiteEnv
