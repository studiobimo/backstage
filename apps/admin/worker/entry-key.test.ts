import { createAdmin } from '@studiobimo/backstage/admin'
import { defineBlock, defineCollection, defineRegistry } from '@studiobimo/backstage'
import { findCollectionEntries, findCollectionEntry } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { kv, sendTo, useFreshPagesDb } from './pages-test-support'

const table = defineCollection({
  name: 'table',
  label: 'code',
  key: 'code',
  snapshot: true,
  schema: z.object({ code: z.string().min(1), seats: z.number() })
})

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

const registry = defineRegistry([note], { collections: [table] })
const admin = createAdmin(registry)

const send = (method: string, path: string, body?: unknown) => sendTo(admin, method, path, body)

interface Created {
  entry: { id: string; version: number; key: string | null }
}

const create = (code: string, seats = 2) =>
  send('POST', '/collections/table/entries', { content: { code, seats } })

const createdEntry = async (code: string) => ((await (await create(code)).json()) as Created).entry

const publish = (id: string, expectedVersion: number) =>
  send('POST', `/collections/table/entries/${id}/publish`, { expectedVersion })

const save = (id: string, code: string, expectedVersion: number) =>
  send('PUT', `/collections/table/entries/${id}`, { content: { code, seats: 2 }, expectedVersion })

const issuesOf = async (response: Response) =>
  ((await response.json()) as { code: string; issues: { path: string[]; code: string }[] }).issues

describe('an entry key', () => {
  useFreshPagesDb()

  it('is exposed on the entry', async () => {
    expect((await createdEntry('t-1')).key).toBe('t-1')
  })

  it('refuses a key with characters outside lowercase letters, digits and hyphens', async () => {
    const response = await create('Table 1')
    expect(response.status).toBe(400)
    expect(await issuesOf(response)).toEqual([{ path: ['code'], code: 'key_invalid' }])
  })

  it('refuses a second entry with the same key, on create and on save', async () => {
    const first = await createdEntry('t-1')
    const duplicate = await create('t-1')
    expect(duplicate.status).toBe(409)
    expect(await issuesOf(duplicate)).toEqual([{ path: ['code'], code: 'key_taken' }])
    const other = await createdEntry('t-2')
    expect((await save(other.id, 't-1', other.version)).status).toBe(409)
    expect((await save(first.id, 't-1', first.version)).status).toBe(200)
  })

  it('frees a key when its entry is deleted', async () => {
    const first = await createdEntry('t-1')
    await send('DELETE', `/collections/table/entries/${first.id}`)
    expect((await create('t-1')).status).toBe(201)
  })

  it('can change while a draft and not while published', async () => {
    const entry = await createdEntry('t-1')
    expect((await save(entry.id, 't-2', entry.version)).status).toBe(200)
    await publish(entry.id, entry.version + 1)
    const refused = await save(entry.id, 't-3', entry.version + 1)
    expect(refused.status).toBe(409)
    expect(await issuesOf(refused)).toEqual([{ path: ['code'], code: 'key_locked' }])
    expect((await save(entry.id, 't-2', entry.version + 1)).status).toBe(200)
  })

  it('can change again after the entry is unpublished', async () => {
    const entry = await createdEntry('t-1')
    await publish(entry.id, entry.version)
    await send('DELETE', `/collections/table/entries/${entry.id}/publish`)
    expect((await save(entry.id, 't-9', entry.version)).status).toBe(200)
  })

  it('finds a published entry by key in the site reader and in queries', async () => {
    const entry = await createdEntry('t-1')
    await publish(entry.id, entry.version)
    await publish((await createdEntry('t-2')).id, 1)
    expect(await findCollectionEntry(kv, registry, 'table', 't-1')).toEqual({
      id: entry.id,
      content: { code: 't-1', seats: 2 }
    })
    expect(await findCollectionEntry(kv, registry, 'table', 'missing')).toBeNull()
    const ordered = await findCollectionEntries(kv, registry, 'table', {
      orderBy: { field: '$key', direction: 'desc' }
    })
    expect(ordered.map(({ content }) => content.code)).toEqual(['t-2', 't-1'])
  })
})
