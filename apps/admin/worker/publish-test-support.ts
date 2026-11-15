import { pagesResponseSchema } from '@studiobimo/backstage/internal'
import { publishedIndexSchema, SEO, snapshotKey, snapshotSchema } from '@studiobimo/backstage/site'
import { expect } from 'vitest'

import { db, kv, send, versionOf } from './pages-test-support'

const welcomeDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Welcome' }] }]
}

export const hero = (pictureId = 'm1') => ({
  id: 'b1',
  block: 'split-hero',
  schemaVersion: 2,
  content: {
    title: { en: 'Hello', es: 'Hola' },
    body: { en: welcomeDoc },
    cta: { en: { href: '/contact', label: 'Contact' } },
    picture: { id: pictureId, alt: '' },
    theme: 'light'
  }
})

export const addMedia = (id: string) =>
  db
    .prepare("INSERT INTO media VALUES (?, ?, 'a.png', 'image/png', 10, 40, 20, 0, ?, NULL, 1)")
    .bind(id, `media/${id}.png`, JSON.stringify({ en: 'A cat', es: 'Un gato' }))
    .run()

export const publish = async (id: string, expectedVersion?: number, bindings: Partial<Env> = {}) =>
  send(
    'POST',
    `/${id}/publish`,
    { expectedVersion: expectedVersion ?? (await versionOf(id)) },
    bindings
  )

export const expectPublishRefused = async (id: string, problems: object[]) => {
  const response = await publish(id)
  expect(response.status).toBe(422)
  expect(await response.json()).toMatchObject({ code: 'unpublishable', problems })
}

export const snapshotOf = async (id: string, locale: 'en' | 'es') =>
  snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(id, locale)))!))

export const publishedPage = async (id: string) =>
  pagesResponseSchema
    .parse(await (await send('GET', '')).json())
    .pages.find((page) => page.id === id)!

export const pageKeys = async () =>
  (await kv.list()).keys.map(({ name }) => name).filter((name) => name !== SEO.indexKey)

export const publishedIndex = async () =>
  publishedIndexSchema.parse(await kv.get(SEO.indexKey, 'json'))
