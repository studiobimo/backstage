import { describe, expect, it } from 'vitest'

import {
  createPost,
  post,
  resetDatabaseBeforeEach,
  publishedContentOf,
  publishEntry,
  publishProblems,
  sendCollections,
  type EntryBody
} from './collections-test-support'
import { kv } from './pages-test-support'

resetDatabaseBeforeEach()

const save = (id: string, title: string, expectedVersion: number) =>
  sendCollections('PUT', `/blog/entries/${id}`, { ...post(title), expectedVersion })

describe('saving entries with optimistic versions', () => {
  it('saves, bumps the version and refreshes the label', async () => {
    const { id } = await createPost('Hello')
    const response = await save(id, 'Goodbye', 1)
    expect(response.status).toBe(200)
    const { entry } = (await response.json()) as EntryBody
    expect(entry).toMatchObject({ version: 2, label: { en: 'Goodbye' } })
  })

  it('answers a stale save with the current stamp and changes nothing', async () => {
    const { id } = await createPost('Hello')
    await save(id, 'Goodbye', 1)
    const response = await save(id, 'Lost', 1)
    expect(response.status).toBe(409)
    const body = (await response.json()) as { code: string; current: { version: number } }
    expect(body).toMatchObject({ code: 'stale_version', current: { version: 2 } })
    const read = (await (await sendCollections('GET', `/blog/entries/${id}`)).json()) as EntryBody
    expect(read.entry.label.en).toBe('Goodbye')
  })

  it('lets only one of two concurrent saves win', async () => {
    const { id } = await createPost('Hello')
    const statuses = (await Promise.all([save(id, 'A', 1), save(id, 'B', 1)])).map((r) => r.status)
    expect(statuses.sort()).toEqual([200, 409])
  })

  it('refuses invalid content and a missing entry', async () => {
    const { id } = await createPost()
    const invalid = await sendCollections('PUT', `/blog/entries/${id}`, {
      content: { title: { en: 7 } },
      expectedVersion: 1
    })
    expect(invalid.status).toBe(400)
    expect((await save('missing', 'Hi', 1)).status).toBe(404)
    expect((await sendCollections('PUT', `/blog/entries/${id}`, post('Hi'))).status).toBe(400)
  })

  it('deletes an entry, answering not found afterwards', async () => {
    const { id } = await createPost()
    expect((await sendCollections('DELETE', `/blog/entries/${id}`)).status).toBe(200)
    expect((await sendCollections('GET', `/blog/entries/${id}`)).status).toBe(404)
    expect((await sendCollections('DELETE', `/blog/entries/${id}`)).status).toBe(404)
  })
})

describe('publishing entries', () => {
  it('records the published content, version and publisher, and writes nothing to KV', async () => {
    const { id } = await createPost('Hello')
    const response = await publishEntry(id, 1)
    expect(response.status).toBe(200)
    const { entry } = (await response.json()) as EntryBody
    expect(entry).toMatchObject({ publishedVersion: 1 })
    expect(entry.publishedAt).toBeGreaterThan(0)
    expect(entry.publishedBy).toBeTruthy()
    expect(await publishedContentOf(id)).toEqual({
      title: { en: 'Hello', es: 'Hello ES' },
      featured: false
    })
    expect((await kv.list()).keys).toEqual([])
  })

  it('keeps the published content while a newer draft is saved', async () => {
    const { id } = await createPost('Hello')
    await publishEntry(id, 1)
    await save(id, 'Draft', 1)
    const { entry } = (await (
      await sendCollections('GET', `/blog/entries/${id}`)
    ).json()) as EntryBody
    expect([entry.version, entry.publishedVersion]).toEqual([2, 1])
    expect((await publishedContentOf(id)).title.en).toBe('Hello')
  })
})

describe('refusing to publish entries', () => {
  it('refuses a stale publish, a missing entry and a body without a version', async () => {
    const { id } = await createPost()
    await save(id, 'Next', 1)
    expect((await publishEntry(id, 1)).status).toBe(409)
    expect((await publishEntry('missing', 1)).status).toBe(404)
    expect((await sendCollections('POST', `/blog/entries/${id}/publish`, {})).status).toBe(400)
  })

  it('refuses to publish an entry without its default locale', async () => {
    expect(await publishProblems({ title: { es: 'Hola' } })).toEqual([
      { reason: 'missing_default_locale', blockId: null, path: 'title' }
    ])
  })

  it('refuses to publish an image that is not in the media library', async () => {
    const problems = await publishProblems({
      ...post('Hi').content,
      cover: { id: 'gone', alt: '' }
    })
    expect(problems.map(({ reason }) => reason)).toEqual(['unknown_media'])
  })
})

describe('unpublishing entries', () => {
  it('unpublishes, clearing the published record and content', async () => {
    const { id } = await createPost()
    await publishEntry(id, 1)
    const response = await sendCollections('DELETE', `/blog/entries/${id}/publish`)
    expect(response.status).toBe(200)
    const { entry } = (await response.json()) as EntryBody
    expect([entry.publishedAt, entry.publishedVersion, entry.publishedBy]).toEqual([
      null,
      null,
      null
    ])
    expect(await publishedContentOf(id)).toBeNull()
    expect((await sendCollections('DELETE', '/blog/entries/missing/publish')).status).toBe(404)
  })
})
