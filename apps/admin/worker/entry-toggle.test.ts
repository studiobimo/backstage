import { describe, expect, it } from 'vitest'

import {
  createPost,
  post,
  publishedContentOf,
  publishEntry,
  resetDatabaseBeforeEach,
  sendCollections,
  type EntryBody
} from './collections-test-support'
import {
  createEntry,
  editEntry,
  publishedPageWith,
  send,
  snapshotOf,
  titlesIn
} from './entry-dependents-test-support'
import {
  createNews,
  newsContent,
  newsSnapshot,
  publishNews,
  sendNews
} from './entry-pages-test-support'

resetDatabaseBeforeEach()

const toggle = (id: string, expectedVersion: number, value = true, field = 'featured') =>
  sendCollections('PUT', `/blog/entries/${id}/toggle`, { field, value, expectedVersion })

const read = async (id: string) =>
  ((await (await sendCollections('GET', `/blog/entries/${id}`)).json()) as EntryBody).entry

describe('toggling a yes/no field from the list', () => {
  it('saves only the draft of an entry that was never published', async () => {
    const { id } = await createPost('Hello')
    const response = await toggle(id, 1)
    expect(response.status).toBe(200)
    const body = (await response.json()) as EntryBody & { writes: number }
    expect(body.entry).toMatchObject({ version: 2, publishedAt: null, toggles: { featured: true } })
    expect(body.writes).toBe(0)
    expect(await publishedContentOf(id)).toBeNull()
  })

  it('publishes the change of a published entry and keeps it free of changes', async () => {
    const { id } = await createPost('Hello')
    await publishEntry(id, 1)
    const response = await toggle(id, 1)
    expect(response.status).toBe(200)
    expect(await read(id)).toMatchObject({ version: 2, publishedVersion: 2 })
    expect(await publishedContentOf(id)).toMatchObject({ featured: true })
  })

  it('publishes only the field over a draft that has other unpublished edits', async () => {
    const { id } = await createPost('Hello')
    await publishEntry(id, 1)
    await sendCollections('PUT', `/blog/entries/${id}`, {
      ...post('Draft only'),
      expectedVersion: 1
    })
    const response = await toggle(id, 2)
    expect(response.status).toBe(200)
    const entry = await read(id)
    expect(entry).toMatchObject({ version: 3, publishedVersion: 1 })
    expect(entry.content).toMatchObject({ title: { en: 'Draft only' }, featured: true })
    expect(await publishedContentOf(id)).toMatchObject({
      title: { en: 'Hello' },
      featured: true
    })
  })

  it('turns the field back off', async () => {
    const { id } = await createPost('Hello')
    await publishEntry(id, 1)
    await toggle(id, 1)
    await toggle(id, 2, false)
    expect(await publishedContentOf(id)).toMatchObject({ featured: false })
  })

  it('refuses a field that is not a quick toggle, a stale version and a missing entry', async () => {
    const { id } = await createPost('Hello')
    expect((await toggle(id, 1, true, 'title')).status).toBe(400)
    expect((await toggle(id, 5)).status).toBe(409)
    expect((await toggle('missing', 1)).status).toBe(404)
    expect((await read(id)).version).toBe(1)
  })

  it('lists the quick toggles with the collection and the value with each entry', async () => {
    const { id } = await createPost('Hello')
    await toggle(id, 1)
    const collections = (await (await sendCollections('GET', '')).json()) as {
      collections: { name: string; quickToggle?: string[] }[]
    }
    expect(collections.collections.find(({ name }) => name === 'blog')?.quickToggle).toEqual([
      'featured'
    ])
    const listed = (await (await sendCollections('GET', '/blog/entries')).json()) as {
      entries: { toggles: Record<string, boolean> }[]
    }
    expect(listed.entries[0]?.toggles).toEqual({ featured: true })
  })
})

describe('toggling a routed entry', () => {
  it('rewrites the snapshots with the published address and content, not the draft', async () => {
    const { entry } = await createNews('Big launch')
    await publishNews(entry.id)
    await sendNews('PUT', `/entries/${entry.id}`, {
      content: newsContent('Renamed'),
      expectedVersion: 1,
      slugs: { en: 'renamed', es: 'renombrado' }
    })
    const response = await sendNews('PUT', `/entries/${entry.id}/toggle`, {
      field: 'pinned',
      value: true,
      expectedVersion: 2
    })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { writes: number }).writes).toBeGreaterThan(0)
    expect(await newsSnapshot(entry.id, 'en')).toMatchObject({
      slug: 'big-launch',
      title: 'Big launch',
      content: { pinned: true, title: { en: 'Big launch' } }
    })
  })
})

describe('toggling an entry that pages show', () => {
  it('refreshes the pages that show it and reports the dependents', async () => {
    const id = await createEntry('Alpha')
    const page = await publishedPageWith('menu', { mode: 'chosen', ids: [id] })
    await editEntry(id, 'Alpha draft', 1)
    const response = await send('PUT', `/collections/post/entries/${id}/toggle`, {
      field: 'soldOut',
      value: true,
      expectedVersion: 2
    })
    const body = (await response.json()) as { republish: { pages: number; writes: number } }
    expect(body.republish).toMatchObject({ pages: 1, writes: 3 })
    const snapshot = await snapshotOf(page.id)
    expect(titlesIn(snapshot)).toEqual(['Alpha'])
    expect(Object.values(snapshot.entries.post ?? {})[0]?.content).toMatchObject({ soldOut: true })
  })
})
