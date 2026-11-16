import { createAdmin } from '@studiobimo/backstage/admin'
import {
  defineBlock,
  defineCollection,
  defineRegistry,
  entries,
  localized
} from '@studiobimo/backstage'
import {
  entryDependentsResponseSchema,
  republishBatchSchema,
  type RepublishBatch,
  type RepublishEntry
} from '@studiobimo/backstage/internal'
import { snapshotKey, snapshotSchema } from '@studiobimo/backstage/site'
import { z } from 'zod'

import { db, kv, regular, sendTo } from './pages-test-support'

const post = defineCollection({
  name: 'post',
  label: 'title',
  schema: z.object({ title: localized(z.string().min(1)) })
})

const postList = defineBlock({
  name: 'post-list',
  schema: z.object({ posts: entries(post, { max: 5 }) })
})

const admin = createAdmin(defineRegistry([postList], { collections: [post] }))

export const send = (method: string, path: string, body?: unknown, bindings = {}) =>
  sendTo(admin, method, path, body, bindings)

const ENTRY_PATH = '/collections/post/entries'

const titled = (title: string) => ({ title: { en: title, es: `${title} ES` } })

export const createEntry = async (title: string) => {
  const created = (await (await send('POST', ENTRY_PATH, { content: titled(title) })).json()) as {
    entry: { id: string }
  }
  await send('POST', `${ENTRY_PATH}/${created.entry.id}/publish`, { expectedVersion: 1 })
  return created.entry.id
}

export const editEntry = (id: string, title: string, expectedVersion: number) =>
  send('PUT', `${ENTRY_PATH}/${id}`, { content: titled(title), expectedVersion })

export const publishEntryAgain = async (id: string, expectedVersion: number) =>
  entryDependentsResponseSchema.parse(
    await (await send('POST', `${ENTRY_PATH}/${id}/publish`, { expectedVersion })).json()
  ).republish

export const unpublishEntry = async (id: string) =>
  entryDependentsResponseSchema.parse(
    await (await send('DELETE', `${ENTRY_PATH}/${id}/publish`)).json()
  ).republish

export const deleteEntry = async (id: string) =>
  entryDependentsResponseSchema.parse(await (await send('DELETE', `${ENTRY_PATH}/${id}`)).json())
    .republish

export const createDraftEntry = async (title: string) =>
  (
    (await (await send('POST', ENTRY_PATH, { content: titled(title) })).json()) as {
      entry: { id: string }
    }
  ).entry.id

const blocksOf = (pageId: string, posts: unknown) => [
  { id: `block-${pageId}`, block: 'post-list', schemaVersion: 1, content: { posts } }
]

export const publishedPageWith = async (slug: string, posts: unknown) => {
  const { page } = (await (await send('POST', '/pages', regular(slug))).json()) as {
    page: { id: string; version: number }
  }
  const saved = (await (
    await send('PUT', `/pages/${page.id}/blocks`, {
      blocks: blocksOf(page.id, posts),
      expectedVersion: page.version
    })
  ).json()) as { version: number }
  await send('POST', `/pages/${page.id}/publish`, { expectedVersion: saved.version })
  return { id: page.id, version: saved.version }
}

export const saveDraft = (id: string, posts: unknown, expectedVersion: number) =>
  send('PUT', `/pages/${id}/blocks`, { blocks: blocksOf(id, posts), expectedVersion })

export const snapshotOf = async (id: string, locale: 'en' | 'es' = 'en') =>
  snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(id, locale)))!))

export const titlesIn = (snapshot: Awaited<ReturnType<typeof snapshotOf>>) =>
  (Object.values(snapshot.references)[0]?.posts ?? []).map(
    (id) =>
      Object.values(
        (snapshot.entries.post?.[id]?.content as { title: Record<string, string> }).title
      )[0]
  )

export const publishedVersionOf = async (id: string) =>
  (await db
    .prepare('SELECT published_version FROM pages WHERE id = ?')
    .bind(id)
    .first<{ published_version: number }>())!.published_version

export const countingBindings = () => {
  const writes: string[] = []
  const site = new Proxy(kv, {
    get: (target, property) => {
      if (property === 'put') {
        return (key: string, ...rest: [string]) => {
          writes.push(key)
          return target.put(key, ...rest)
        }
      }
      const member = Reflect.get(target, property)
      return typeof member === 'function' ? member.bind(target) : member
    }
  })
  return { bindings: { SITE: site }, writes }
}

export const drive = async (entry: RepublishEntry, bindings = {}) => {
  const batches: RepublishBatch[] = []
  let cursor: string | null = null
  while (batches.at(-1)?.done !== true) {
    const batch: RepublishBatch = republishBatchSchema.parse(
      await (await send('POST', '/republish', { since: null, cursor, entry }, bindings)).json()
    )
    batches.push(batch)
    cursor = batch.cursor
  }
  return batches
}
