import { API_ERROR } from '@studiobimo/backstage'
import { FORM_PROJECTION, formProjectionKey } from '@studiobimo/backstage/site'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { BOOKING_FORM } from '../src/forms/booking/form'
import { SLOTS_ROUTE, slotsPathOf } from '../src/forms/route'
import { clearKv, get, kv, platform, publishSiteSnapshots, siteSnapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const MONDAY = '2099-03-02'
const ROOM = 'room-a'
const CONTACT = { phone: '+34 600 000 000', address: { en: '1 Main St', es: 'Plaza Mayor 1' } }
const BOOKING = {
  hours: {
    timeZone: 'America/New_York',
    week: { monday: [{ open: '09:00', close: '12:00' }] }
  },
  step: 60,
  minDuration: 60,
  maxDuration: 120
}

const publishSettings = (settings: Record<string, unknown>) =>
  publishSiteSnapshots(
    siteSnapshotOf({ locale: 'en', settings }),
    siteSnapshotOf({ locale: 'es', settings })
  )

const publishBookings = (entries: Record<string, unknown>[]) =>
  kv.put(
    formProjectionKey(BOOKING_FORM.name),
    JSON.stringify({
      format: FORM_PROJECTION.format,
      form: BOOKING_FORM.name,
      publishedAt: 1,
      entries
    })
  )

const taken = (start: string, end: string, resource = ROOM) => ({
  resource,
  date: MONDAY,
  start,
  end
})

const slotsFor = (resource: string, duration: number) =>
  get(
    `${slotsPathOf(resource)}?${SLOTS_ROUTE.query.date}=${MONDAY}&${SLOTS_ROUTE.query.duration}=${duration}`
  )

const startsOf = async (response: Response) =>
  ((await response.json()) as { slots: { start: string }[] }).slots.map((slot) => slot.start)

describe('the bookable slots of a day', () => {
  beforeEach(() => publishSettings({ contact: CONTACT, booking: BOOKING }))

  it('offers every start that fits before closing', async () => {
    expect(await startsOf(await slotsFor(ROOM, 60))).toEqual(['09:00', '10:00', '11:00'])
    expect(await startsOf(await slotsFor(ROOM, 120))).toEqual(['09:00', '10:00'])
  })

  it('keeps the starts that only touch a confirmed booking and drops those that overlap it', async () => {
    await publishBookings([taken('10:00', '11:00')])
    expect(await startsOf(await slotsFor(ROOM, 60))).toEqual(['09:00', '11:00'])
    expect(await startsOf(await slotsFor(ROOM, 120))).toEqual([])
  })

  it('leaves another resource untouched', async () => {
    await publishBookings([taken('10:00', '11:00', 'room-b')])
    expect(await startsOf(await slotsFor(ROOM, 60))).toEqual(['09:00', '10:00', '11:00'])
  })

  it('refuses a length outside the minimum and maximum', async () => {
    for (const duration of [30, 180]) {
      const response = await slotsFor(ROOM, duration)
      expect(response.status).toBe(API_ERROR.invalid.status)
    }
  })

  it('answers not found when no booking settings were published', async () => {
    await publishSettings({ contact: CONTACT })
    const response = await slotsFor(ROOM, 60)
    expect(response.status).toBe(API_ERROR.notFound.status)
  })
})
