import { snapshotKey, snapshotSchema } from '@studiobimo/backstage'
import { db, kv, send, versionOf } from './pages-test-support'

export const hero = (pictureId = 'm1') => ({
  id: 'b1',
  block: 'hero',
  schemaVersion: 1,
  content: {
    title: { en: 'Hello', es: 'Hola' },
    body: {},
    cta: { href: '/contact', label: 'Contact' },
    picture: { id: pictureId, alt: '' },
    theme: 'light'
  }
})

export const addMedia = (id: string) =>
  db
    .prepare("INSERT INTO media VALUES (?, ?, 'a.png', 'image/png', 10, 40, 20, 0, ?, NULL, 1)")
    .bind(id, `media/${id}.png`, JSON.stringify({ en: 'A cat', es: 'Un gato' }))
    .run()

export const publish = async (id: string, expectedVersion?: number) =>
  send('POST', `/${id}/publish`, { expectedVersion: expectedVersion ?? (await versionOf(id)) })

export const snapshotOf = async (id: string, locale: 'en' | 'es') =>
  snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(id, locale)))!))

export const publishedPage = async (id: string) =>
  ((await (await send('GET', '')).json()) as { pages: Record<string, unknown>[] }).pages.find(
    (page) => page.id === id
  )!
