import { collectionSnapshotKey, collectionSnapshotOf } from '@studiobimo/backstage/site'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { SEATS_ROUTE } from '../src/collections/seats/route'
import { SEAT, type Seat } from '../src/collections/seats/schema'
import { get, kv, platform } from './test-support'

afterAll(() => platform.dispose())

const seat = (code: string, zone: Seat['zone'], capacity: number) => ({
  id: `id-${code}`,
  content: { code, zone, capacity }
})

const publishSeats = (...seats: ReturnType<typeof seat>[]) =>
  kv.put(
    collectionSnapshotKey(SEAT.name),
    JSON.stringify(collectionSnapshotOf(SEAT.name, seats, 1))
  )

const listed = async (query = '') => {
  const response = await get(`${SEATS_ROUTE.path.list}${query}`)
  const { seats } = (await response.json()) as { seats: { content: Seat }[] }
  return seats.map(({ content }) => content.code)
}

beforeEach(() => kv.delete(collectionSnapshotKey(SEAT.name)))

describe('listing seats from the published collection', () => {
  it('lists them largest first', async () => {
    await publishSeats(seat('a1', 'bar', 2), seat('b1', 'patio', 6), seat('c1', 'main', 4))
    expect(await listed()).toEqual(['b1', 'c1', 'a1'])
  })

  it('filters by zone', async () => {
    await publishSeats(seat('a1', 'bar', 2), seat('b1', 'patio', 6), seat('b2', 'patio', 4))
    expect(await listed(`?${SEATS_ROUTE.query.zone}=patio`)).toEqual(['b1', 'b2'])
  })

  it('no longer lists a seat once it is unpublished', async () => {
    await publishSeats(seat('a1', 'bar', 2), seat('b1', 'patio', 6))
    await publishSeats(seat('b1', 'patio', 6))
    expect(await listed()).toEqual(['b1'])
  })

  it('is empty before anything is published', async () => {
    expect(await listed()).toEqual([])
  })
})

describe('finding a seat by key', () => {
  const byKey = (key: string) => get(SEATS_ROUTE.path.byKey.replace(':key', key))

  it('returns the seat', async () => {
    await publishSeats(seat('a1', 'bar', 2))
    const response = await byKey('a1')
    expect(response.status).toBe(200)
    expect(((await response.json()) as { seat: { content: Seat } }).seat.content.code).toBe('a1')
  })

  it('answers not found for an unknown key', async () => {
    await publishSeats(seat('a1', 'bar', 2))
    expect((await byKey('zz')).status).toBe(404)
  })
})
