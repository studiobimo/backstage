import { setSubmissionStatus } from '@studiobimo/backstage/admin'
import { findFormProjection } from '@studiobimo/backstage/site'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db, kv, useFreshPagesDb } from './pages-test-support'
import { testRegistry } from './test-registry'
import { answerTurnstile, reservation, submit, submitted } from './forms-test-support'

const PROJECTION_KEY = 'form:reservation'
const confirmedSeats = { seats: 4, date: '2026-12-24', time: '20:30' }

const projectedEntries = async () =>
  (await findFormProjection(kv, testRegistry, 'reservation'))?.entries

describe('publishing the confirmed reservations', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('publishes nothing while a request is still new', async () => {
    await submitted()
    expect(await projectedEntries()).toEqual([])
  })

  it('adds a reservation when it is confirmed', async () => {
    const { id } = await submitted()
    await setSubmissionStatus(db, kv, testRegistry, id, 'confirmed')
    expect(await projectedEntries()).toEqual([confirmedSeats])
  })

  it('removes it again when it is declined', async () => {
    const { id } = await submitted()
    await setSubmissionStatus(db, kv, testRegistry, id, 'confirmed')
    await setSubmissionStatus(db, kv, testRegistry, id, 'declined')
    expect(await projectedEntries()).toEqual([])
  })

  it('lists only the confirmed ones among several', async () => {
    const first = await submitted()
    const second = (await submit({ ...reservation, seats: 2 })) as { id: string }
    await submit({ ...reservation, seats: 6 })
    await setSubmissionStatus(db, kv, testRegistry, first.id, 'confirmed')
    await setSubmissionStatus(db, kv, testRegistry, second.id, 'confirmed')
    expect((await projectedEntries())?.map((entry) => entry.seats)).toEqual([4, 2])
  })

  it('never stores a private field, the id or the token', async () => {
    const { id, token } = await submitted()
    await setSubmissionStatus(db, kv, testRegistry, id, 'confirmed')
    const stored = (await kv.get(PROJECTION_KEY))!
    for (const secret of ['phone', 'name', 'Ana', '600', 'preorder', id, token]) {
      expect(stored).not.toContain(secret)
    }
  })

  it('answers null before anything is published', async () => {
    expect(await findFormProjection(kv, testRegistry, 'reservation')).toBeNull()
  })
})
