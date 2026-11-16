import { createAdmin } from '@studiobimo/backstage/admin'
import {
  defineBlock,
  defineCollection,
  defineRegistry,
  entries,
  localized
} from '@studiobimo/backstage'
import { snapshotKey, snapshotSchema } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { db, kv, regular, sendTo, useFreshPagesDb } from './pages-test-support'

const post = defineCollection({
  name: 'post',
  label: 'title',
  schema: z.object({ title: localized(z.string().min(1)), body: z.string().default('') })
})

const postList = defineBlock({
  name: 'post-list',
  schema: z.object({ posts: entries(post, { max: 3 }) })
})

const admin = createAdmin(defineRegistry([postList], { collections: [post] }))

const OK = 200
const send = (method: string, path: string, body?: unknown) => sendTo(admin, method, path, body)

const createEntry = async (title: string, publish = true) => {
  const created = (await (
    await send('POST', '/collections/post/entries', {
      content: { title: { en: title, es: `${title} ES` } }
    })
  ).json()) as { entry: { id: string; version: number } }
  const { id, version } = created.entry
  if (publish) {
    await send('POST', `/collections/post/entries/${id}/publish`, { expectedVersion: version })
    await db.prepare('UPDATE entries SET published_at = ? WHERE id = ?').bind(rank(title), id).run()
  }
  return id
}

const rank = (title: string) => title.charCodeAt(0)

const pageWith = async (posts: unknown) => {
  const { page } = (await (await send('POST', '/pages', regular('about'))).json()) as {
    page: { id: string; version: number }
  }
  const saved = await send('PUT', `/pages/${page.id}/blocks`, {
    blocks: [{ id: 'b1', block: 'post-list', schemaVersion: 1, content: { posts } }],
    expectedVersion: page.version
  })
  expect(saved.status).toBe(OK)
  return page.id
}

const publishPage = async (id: string) => {
  const blocks = (await (await send('GET', `/pages/${id}/blocks`)).json()) as { version: number }
  return send('POST', `/pages/${id}/publish`, { expectedVersion: blocks.version })
}

const snapshotOf = async (id: string, locale: 'en' | 'es') =>
  snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(id, locale)))!))

const refsOf = async (id: string) =>
  (
    await db
      .prepare(
        'SELECT collection, entry_id FROM page_entry_refs WHERE page_id = ? ORDER BY entry_id'
      )
      .bind(id)
      .all<{ collection: string; entry_id: string | null }>()
  ).results

describe('entry references when publishing a page', () => {
  useFreshPagesDb()

  it('resolves chosen entries in order from their published content, per locale', async () => {
    const first = await createEntry('Alpha')
    const second = await createEntry('Beta')
    const id = await pageWith({ mode: 'chosen', ids: [second, first] })
    expect((await publishPage(id)).status).toBe(OK)
    const en = await snapshotOf(id, 'en')
    expect(en.references).toEqual({ b1: { posts: [second, first] } })
    expect(en.entries.post?.[first]?.content).toMatchObject({ title: { en: 'Alpha' }, body: '' })
    expect((await snapshotOf(id, 'es')).entries.post?.[second]?.content).toMatchObject({
      title: { es: 'Beta ES' }
    })
  })

  it('never leaks a draft edit and drops unpublished or missing entries', async () => {
    const published = await createEntry('Alpha')
    const draft = await createEntry('Beta', false)
    await send('PUT', `/collections/post/entries/${published}`, {
      content: { title: { en: 'Edited draft' } },
      expectedVersion: 1
    })
    const id = await pageWith({ mode: 'chosen', ids: [draft, 'missing', published] })
    expect((await publishPage(id)).status).toBe(OK)
    const en = await snapshotOf(id, 'en')
    expect(en.references.b1?.posts).toEqual([published])
    expect(en.entries.post?.[published]?.content).toMatchObject({ title: { en: 'Alpha' } })
    expect(await refsOf(id)).toEqual(
      expect.arrayContaining([
        { collection: 'post', entry_id: draft },
        { collection: 'post', entry_id: 'missing' }
      ])
    )
  })

  it('takes the latest published entries, newest first, and records the collection', async () => {
    await createEntry('Alpha')
    await createEntry('Gamma')
    await createEntry('Beta')
    await createEntry('Draft', false)
    const id = await pageWith({ mode: 'latest', count: 2 })
    expect((await publishPage(id)).status).toBe(OK)
    const en = await snapshotOf(id, 'en')
    const titles = (en.references.b1?.posts ?? []).map(
      (entryId) => (en.entries.post?.[entryId]?.content as { title: { en: string } }).title.en
    )
    expect(titles).toEqual(['Gamma', 'Beta'])
    expect(await refsOf(id)).toEqual([{ collection: 'post', entry_id: null }])
  })

  it('previews the draft page with the same resolved entries', async () => {
    const entry = await createEntry('Alpha')
    const id = await pageWith({ mode: 'chosen', ids: [entry] })
    const response = await send('POST', `/pages/${id}/preview`)
    const { token } = (await response.json()) as { token: string }
    const stored = (await kv.get(`preview:${token}`, 'json')) as {
      snapshots: { references: unknown }[]
    }
    expect(stored.snapshots[0]?.references).toEqual({ b1: { posts: [entry] } })
  })

  it('clears the recorded references on unpublish and with the page', async () => {
    const entry = await createEntry('Alpha')
    const id = await pageWith({ mode: 'chosen', ids: [entry] })
    await publishPage(id)
    expect(await refsOf(id)).toHaveLength(1)
    await send('DELETE', `/pages/${id}/publish`)
    expect(await refsOf(id)).toEqual([])
    await publishPage(id)
    await send('DELETE', `/pages/${id}`)
    expect(await refsOf(id)).toEqual([])
  })
})
