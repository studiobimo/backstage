import {
  BLOCK_PREVIEW,
  SITE_SNAPSHOT,
  siteSnapshotRecords,
  SNAPSHOT,
  snapshotRecords,
  type PageBlock,
  type SiteSnapshot,
  type Snapshot
} from '@studiobimo/backstage/site'
import type { Locale } from '@studiobimo/backstage'
import { getPlatformProxy } from 'wrangler'

import app from './index'

export const platform = await getPlatformProxy<Env>({ persist: false })

export const kv = platform.env.SITE!

export const get = (path: string, executionCtx?: ExecutionContext, env: Env = platform.env) =>
  app.request(path, {}, env, executionCtx)

export const stylesheetPath = async () => {
  const html = await (await get(`${BLOCK_PREVIEW.path}/split-hero`)).text()
  return /<link rel="stylesheet" href="([^"]+)"/.exec(html)![1]!
}

export const richParagraph = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

export const heroBlock = (
  title: Record<string, string>,
  body: Record<string, unknown> = {}
): PageBlock => ({
  id: 'b1',
  block: 'split-hero',
  schemaVersion: 2,
  content: {
    title,
    body,
    cta: {
      en: { href: '/contact', label: 'Contact' },
      es: { href: '/contacto', label: 'Contacto' }
    },
    picture: { id: 'm1', alt: '' },
    theme: 'light'
  } as PageBlock['content']
})

const MEDIA_ENTRY = {
  key: 'media/m1.png',
  contentType: 'image/png',
  width: 40,
  height: 20,
  alt: 'A cat'
}

export const snapshotOf = (overrides: Partial<Snapshot> & { locale: Locale }): Snapshot => ({
  format: SNAPSHOT.format,
  pageId: 'p1',
  isHome: false,
  slug: 'about',
  title: 'About',
  layout: 'default',
  version: 1,
  publishedAt: 1,
  seo: { title: '', description: '', socialImageId: null },
  blocks: [],
  entries: {},
  references: {},
  media: { m1: MEDIA_ENTRY },
  ...overrides
})

export const publishSnapshots = (...snapshots: Snapshot[]) =>
  Promise.all(snapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))

export const siteSnapshotOf = (
  overrides: Partial<SiteSnapshot> & { locale: Locale }
): SiteSnapshot => ({
  format: SITE_SNAPSHOT.format,
  publishedAt: 1,
  siteName: 'Studio',
  brand: { logo: null, themeColor: null },
  seo: { description: '', socialImageId: null },
  slots: {},
  media: {},
  ...overrides
})

export const publishSiteSnapshots = (...snapshots: SiteSnapshot[]) =>
  Promise.all(siteSnapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))

export const clearKv = async () => {
  const { keys } = await kv.list()
  await Promise.all(keys.map(({ name }) => kv.delete(name)))
}

export function directives(response: Response) {
  const policy = response.headers.get('Content-Security-Policy') ?? ''
  return new Map(
    policy
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources])
  )
}
