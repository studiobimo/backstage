import { createAdmin } from '@studiobimo/backstage/admin'
import { defineBlock, defineCollection, defineRegistry } from '@studiobimo/backstage'
import {
  collectionSnapshotKey,
  findCollectionEntries,
  type CollectionEntryQuery
} from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { kv, sendTo, useFreshPagesDb } from './pages-test-support'

const seat = defineCollection({
  name: 'seat',
  label: 'code',
  snapshot: true,
  schema: z.object({ code: z.string().min(1), zone: z.string(), capacity: z.number() })
})

const room = defineCollection({
  name: 'room',
  label: 'code',
  schema: z.object({ code: z.string().min(1) })
})

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

const registry = defineRegistry([note], { collections: [seat, room] })
const admin = createAdmin(registry)

const send = (method: string, path: string, body?: unknown) => sendTo(admin, method, path, body)

const createPublished = async (collection: string, content: object, publish = true) => {
  const { entry } = (await (
    await send('POST', `/collections/${collection}/entries`, { content })
  ).json()) as { entry: { id: string; version: number } }
  if (publish) {
    await send('POST', `/collections/${collection}/entries/${entry.id}/publish`, {
      expectedVersion: entry.version
    })
  }
  return entry
}

const seatContent = (code: string, zone: string, capacity: number) => ({ code, zone, capacity })

const codesOf = async (query: CollectionEntryQuery<z.output<typeof seat.schema>>) =>
  (await findCollectionEntries(kv, registry, 'seat', query)).map(({ content }) => content.code)

describe('a collection snapshot', () => {
  useFreshPagesDb()

  it('is written when an entry is published and lists it', async () => {
    expect(await kv.get(collectionSnapshotKey('seat'))).toBeNull()
    const { id } = await createPublished('seat', seatContent('a1', 'bar', 2))
    expect(await findCollectionEntries(kv, registry, 'seat')).toEqual([
      { id, content: seatContent('a1', 'bar', 2) }
    ])
  })

  it('leaves out a draft and drops an entry that is unpublished', async () => {
    const live = await createPublished('seat', seatContent('a1', 'bar', 2))
    await createPublished('seat', seatContent('a2', 'bar', 4), false)
    expect(await codesOf({})).toEqual(['a1'])
    await send('DELETE', `/collections/seat/entries/${live.id}/publish`)
    expect(await codesOf({})).toEqual([])
  })

  it('drops an entry that is deleted', async () => {
    const live = await createPublished('seat', seatContent('a1', 'bar', 2))
    await createPublished('seat', seatContent('a2', 'bar', 4))
    await send('DELETE', `/collections/seat/entries/${live.id}`)
    expect(await codesOf({})).toEqual(['a2'])
  })

  it('filters, orders and limits with the same rules as an entries query', async () => {
    await createPublished('seat', seatContent('a1', 'bar', 2))
    await createPublished('seat', seatContent('b1', 'patio', 6))
    await createPublished('seat', seatContent('b2', 'patio', 4))
    expect(await codesOf({ where: { zone: 'patio' } })).toEqual(['b1', 'b2'])
    expect(await codesOf({ orderBy: { field: 'capacity', direction: 'desc' } })).toEqual([
      'b1',
      'b2',
      'a1'
    ])
    expect(
      await codesOf({
        where: { zone: 'patio' },
        orderBy: { field: 'capacity', direction: 'asc' },
        limit: 1
      })
    ).toEqual(['b2'])
  })

  it('follows a manual reorder', async () => {
    const first = await createPublished('seat', seatContent('a1', 'bar', 2))
    const second = await createPublished('seat', seatContent('a2', 'bar', 4))
    await send('PUT', '/collections/seat/order', { ids: [second.id, first.id] })
    expect(await codesOf({})).toEqual(['a2', 'a1'])
  })

  it('is rebuilt by republishing everything', async () => {
    await createPublished('seat', seatContent('a1', 'bar', 2))
    await kv.delete(collectionSnapshotKey('seat'))
    expect(await codesOf({})).toEqual([])
    const response = await send('POST', '/republish', { since: null, cursor: null })
    expect(response.status).toBe(200)
    expect(await codesOf({})).toEqual(['a1'])
  })

  it('is not written for a collection without snapshot', async () => {
    await createPublished('room', { code: 'r1' })
    expect(await kv.get(collectionSnapshotKey('room'))).toBeNull()
    expect(await findCollectionEntries(kv, registry, 'room')).toEqual([])
  })
})
