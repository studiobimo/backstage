import { describe, expect, it } from 'vitest'

import {
  createPost,
  issuePaths,
  post,
  resetDatabaseBeforeEach,
  sendCollections,
  type EntryBody
} from './collections-test-support'
import { db, kv } from './pages-test-support'

resetDatabaseBeforeEach()

interface CollectionsBody {
  collections: { name: string; version: number; label: string; schema: { properties: object } }[]
}

describe('collections API', () => {
  it('describes every registered collection with its JSON Schema', async () => {
    const response = await sendCollections('GET', '')
    expect(response.status).toBe(200)
    const { collections } = (await response.json()) as CollectionsBody
    expect(collections.map(({ name, label, version }) => [name, label, version])).toEqual([
      ['blog', 'title', 1],
      ['people', 'name', 2]
    ])
    expect(Object.keys(collections[0]!.schema.properties)).toEqual([
      'title',
      'summary',
      'cover',
      'featured'
    ])
  })

  it('answers not found for an unknown collection', async () => {
    for (const [method, path] of [
      ['GET', '/nope/entries'],
      ['POST', '/nope/entries'],
      ['GET', '/nope/entries/x'],
      ['DELETE', '/nope/entries/x'],
      ['POST', '/nope/entries/x/publish']
    ] as const) {
      expect(
        (await sendCollections(method, path, method === 'POST' ? post('Hi') : undefined)).status
      ).toBe(404)
    }
  })
})

describe('creating and reading entries', () => {
  it('creates a draft with the parsed content, a label per locale and version 1', async () => {
    const response = await sendCollections('POST', '/blog/entries', post('Hello'))
    expect(response.status).toBe(201)
    const { entry } = (await response.json()) as EntryBody
    expect(entry).toMatchObject({
      collection: 'blog',
      version: 1,
      schemaVersion: 1,
      label: { en: 'Hello', es: 'Hello ES' },
      content: { title: { en: 'Hello', es: 'Hello ES' }, featured: false },
      publishedAt: null,
      publishedVersion: null
    })
    expect(entry.updatedBy).toBeTruthy()
  })

  it('lists only the entries of the collection asked for', async () => {
    const first = await createPost('First')
    const second = await createPost('Second')
    await sendCollections('POST', '/people/entries', { content: { name: 'Ada' } })
    const { entries } = (await (await sendCollections('GET', '/blog/entries')).json()) as {
      entries: { id: string; content?: unknown }[]
    }
    expect(new Set(entries.map(({ id }) => id))).toEqual(new Set([first.id, second.id]))
    expect(entries).toHaveLength(2)
  })

  it('reads one entry back, and not through another collection', async () => {
    const { id } = await createPost()
    expect((await sendCollections('GET', `/blog/entries/${id}`)).status).toBe(200)
    expect((await sendCollections('GET', `/people/entries/${id}`)).status).toBe(404)
    expect((await sendCollections('GET', '/blog/entries/missing')).status).toBe(404)
  })

  it('refuses content that does not match the collection schema, with zod issues', async () => {
    const response = await sendCollections('POST', '/blog/entries', {
      content: { title: { en: 42 }, featured: 'yes' }
    })
    expect(await issuePaths(response)).toEqual(['featured', 'title.en'])
  })

  it('refuses a body that is not JSON content', async () => {
    expect((await sendCollections('POST', '/blog/entries', {})).status).toBe(400)
  })
})

describe('entries written by an older schema version', () => {
  it('upgrades the content with the collection migration when it is read', async () => {
    await db
      .prepare(
        "INSERT INTO entries (id, collection, schema_version, content, label, created_at, updated_at) VALUES ('p1', 'people', 1, '{\"name\":\"Ada\"}', '{}', 1, 1)"
      )
      .run()
    const { entry } = (await (
      await sendCollections('GET', '/people/entries/p1')
    ).json()) as EntryBody
    expect(entry).toMatchObject({
      schemaVersion: 2,
      content: { name: 'Ada', role: 'migrated' }
    })
  })

  it('stores a saved entry at the current schema version', async () => {
    const created = (await (
      await sendCollections('POST', '/people/entries', { content: { name: 'Bo' } })
    ).json()) as EntryBody
    expect(created.entry.schemaVersion).toBe(2)
    expect(await kv.list()).toMatchObject({ keys: [] })
  })
})
