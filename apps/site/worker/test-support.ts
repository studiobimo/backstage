import {
  SNAPSHOT,
  snapshotRecords,
  type Locale,
  type PageBlock,
  type Snapshot
} from '@studiobimo/backstage'
import { getPlatformProxy } from 'wrangler'

import app from './index'

export const platform = await getPlatformProxy<Env>({ persist: false })

export const kv = platform.env.SITE!

export const get = (path: string, executionCtx?: ExecutionContext, env: Env = platform.env) =>
  app.request(path, {}, env, executionCtx)

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
  schemaVersion: 1,
  content: {
    title,
    body,
    cta: { href: '/contact', label: 'Contact' },
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
  media: { m1: MEDIA_ENTRY },
  ...overrides
})

export const publishSnapshots = (...snapshots: Snapshot[]) =>
  Promise.all(snapshotRecords(snapshots).map(({ key, value }) => kv.put(key, value)))

export const clearKv = async () => {
  const { keys } = await kv.list()
  await Promise.all(keys.map(({ name }) => kv.delete(name)))
}
