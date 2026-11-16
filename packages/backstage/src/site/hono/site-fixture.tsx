import type { ReactNode } from 'react'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry, SLOT } from '../../blocks.ts'
import { defineCollection } from '../../collections.ts'
import { defineComponents } from '../../components.ts'
import { localized } from '../../fields.ts'
import { useLocalized } from '../../render/context.ts'
import { entries, type ResolvedEntry } from '../../references.ts'
import type { LocaleConfig } from '../../locales.ts'
import { NO_REFERENCES } from '../../references.ts'
import { ENTRY_SNAPSHOT, entrySnapshotRecords, type EntrySnapshot } from '../../entry-publishing.ts'
import { SNAPSHOT, snapshotRecords, type Snapshot } from '../../publishing.ts'
import {
  EMPTY_PUBLISHED_INDEX,
  SEO,
  upsertIntoIndex,
  type PublishedEntryPage,
  type PublishedIndex
} from '../../seo.ts'
import { SITE_SNAPSHOT, siteSnapshotKey, type SiteSnapshot } from '../../site-publishing.ts'
import type { SiteEnv } from '../index.ts'
import type { CreateSiteOptions } from './create-site.ts'

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
const header = defineBlock({ name: 'header', schema: z.object({ text: z.string() }) })

export const post = defineCollection({
  name: 'post',
  label: 'title',
  route: { path: '/blog/:slug' },
  schema: z.object({ title: localized(z.string()) })
})

const postList = defineBlock({
  name: 'post-list',
  schema: z.object({ posts: entries(post, { max: 5 }) })
})

const registryFor = (locales: LocaleConfig) =>
  defineRegistry([note, header, postList], {
    collections: [post],
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

const PostPage = ({ title }: { title: Partial<Record<string, string>> }) => (
  <article>
    <h1>{useLocalized(title)}</h1>
  </article>
)

const PostItem = ({ title, href }: { title: Partial<Record<string, string>>; href?: string }) => {
  const text = useLocalized(title)
  return <li>{href ? <a href={href}>{text}</a> : text}</li>
}

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
      header: ({ text }: { text: string }) => <header>{text}</header>,
      'post-list': ({ posts }: { posts: ResolvedEntry<typeof post>[] }) => (
        <ul>
          {posts.map(({ id, content, href }) => (
            <PostItem key={id} title={content.title} href={href} />
          ))}
        </ul>
      )
    },
    layouts: { default: Layout },
    collections: { post: PostPage }
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
  ...NO_REFERENCES,
  media: {},
  ...overrides
})

export const entrySnapshot = (overrides: Partial<EntrySnapshot> = {}): EntrySnapshot => ({
  format: ENTRY_SNAPSHOT.format,
  collection: 'post',
  entryId: 'e1',
  locale: 'en',
  slug: 'hello',
  title: 'Hello',
  schemaVersion: 1,
  version: 1,
  publishedAt: 1,
  content: { title: { en: 'Hello' } },
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

const entryPagesOf = (snapshots: EntrySnapshot[]): PublishedEntryPage[] =>
  Object.values(Object.groupBy(snapshots, ({ entryId }) => entryId)).flatMap((group) =>
    group?.[0]
      ? [
          {
            collection: group[0].collection,
            entryId: group[0].entryId,
            publishedAt: group[0].publishedAt,
            slugs: Object.fromEntries(group.map(({ locale, slug }) => [locale, slug]))
          }
        ]
      : []
  )

const publishedIndexOf = (snapshots: Snapshot[], entries: EntrySnapshot[]): PublishedIndex => ({
  ...Object.values(Object.groupBy(snapshots, ({ pageId }) => pageId)).reduce(
    (index, group) => upsertIntoIndex(index, group ?? []),
    EMPTY_PUBLISHED_INDEX
  ),
  entries: entryPagesOf(entries)
})

export const memoryKv = (
  snapshots: Snapshot[] = [],
  sites: SiteSnapshot[] = [],
  extra: Record<string, string> = {},
  entries: EntrySnapshot[] = []
) => {
  const records = new Map<string, string>([
    [SEO.indexKey, JSON.stringify(publishedIndexOf(snapshots, entries))],
    ...snapshotRecords(snapshots).map(({ key, value }): [string, string] => [key, value]),
    ...entrySnapshotRecords(entries, post.route).map(({ key, value }): [string, string] => [
      key,
      value
    ]),
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
