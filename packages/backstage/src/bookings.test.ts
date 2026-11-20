import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { bookingDuration, occupiedAt, rangesOverlap } from './bookings.ts'
import { classifyField } from './field-shapes.ts'
import { timeOfDay } from './fields.ts'
import type { TranslatedNode } from './translations.ts'
import { slotsFor, weeklyHours } from './weekly-hours.ts'

const clinic = weeklyHours().parse({
  timeZone: 'America/New_York',
  week: {
    monday: [{ open: '09:00', close: '17:00' }],
    saturday: [{ open: '22:00', close: '04:00' }]
  }
})
const farAway = new Date('2020-01-01T00:00:00Z')
const utcTimes = (slots: Date[]) => slots.map((slot) => slot.toISOString().slice(11, 16))

describe('slotsFor with a duration', () => {
  it('keeps the old behaviour without one', () => {
    expect(slotsFor(clinic, '2026-03-02', { step: 120, now: farAway })).toHaveLength(4)
  })

  it('drops a start whose booking would run past closing', () => {
    const slots = slotsFor(clinic, '2026-03-02', { step: 60, duration: 90, now: farAway })
    expect(slots).toHaveLength(7)
    expect(utcTimes(slots).at(-1)).toBe('20:00')
  })

  it('keeps a start whose booking ends exactly at closing', () => {
    const slots = slotsFor(clinic, '2026-03-02', { step: 60, duration: 60, now: farAway })
    expect(slots).toHaveLength(8)
  })

  it('fits a booking inside an overnight range', () => {
    const slots = slotsFor(clinic, '2026-03-14', { step: 60, duration: 120, now: farAway })
    expect(utcTimes(slots)).toEqual(['02:00', '03:00', '04:00', '05:00', '06:00'])
  })

  it('counts the real elapsed time across a daylight saving change', () => {
    const night = { step: 60, now: farAway }
    const sixHours = slotsFor(clinic, '2026-03-07', { ...night, duration: 360 })
    const fiveHours = slotsFor(clinic, '2026-03-07', { ...night, duration: 300 })
    expect(sixHours).toEqual([])
    expect(utcTimes(fiveHours)).toEqual(['03:00'])
  })

  it('offers nothing for a negative duration', () => {
    expect(slotsFor(clinic, '2026-03-02', { step: 60, duration: -5, now: farAway })).toEqual([])
  })
})

describe('rangesOverlap', () => {
  it('detects ranges that share time', () => {
    expect(rangesOverlap({ start: 10, end: 20 }, { start: 15, end: 25 })).toBe(true)
    expect(rangesOverlap({ start: 10, end: 30 }, { start: 15, end: 20 })).toBe(true)
  })

  it('does not count ranges that only touch', () => {
    expect(rangesOverlap({ start: 10, end: 20 }, { start: 20, end: 30 })).toBe(false)
    expect(rangesOverlap({ start: 20, end: 30 }, { start: 10, end: 20 })).toBe(false)
  })

  it('takes dates as well as numbers', () => {
    const a = { start: new Date('2026-03-02T10:00:00Z'), end: new Date('2026-03-02T11:00:00Z') }
    const b = { start: new Date('2026-03-02T11:00:00Z'), end: new Date('2026-03-02T12:00:00Z') }
    expect(rangesOverlap(a, b)).toBe(false)
  })
})

describe('occupiedAt', () => {
  const entries = [
    { resource: 'room-a', date: '2026-03-02', start: '10:00', end: '11:00' },
    { resource: 'room-b', date: '2026-03-02', start: '10:00', end: '11:00' },
    { resource: 'room-a', date: '2026-03-02', start: '23:00', end: '01:00' },
    { resource: 'room-a', date: '2026-03-02', start: 'soon', end: '11:00' }
  ]
  const query = { date: '2026-03-02', timeZone: 'America/New_York' }
  const roomA = { ...query, resource: 'room-a' }

  it('finds the entry that shares time on the same resource', () => {
    expect(occupiedAt(entries, { ...roomA, start: '10:30', end: '11:30' })).toEqual([entries[0]])
  })

  it('lets a request touch an existing one', () => {
    expect(occupiedAt(entries, { ...roomA, start: '11:00', end: '12:00' })).toEqual([])
    expect(occupiedAt(entries, { ...roomA, start: '09:00', end: '10:00' })).toEqual([])
  })

  it('treats an end at or before the start as the next morning', () => {
    const next = { ...roomA, date: '2026-03-03', start: '00:30', end: '02:00' }
    expect(occupiedAt(entries, next)).toEqual([entries[2]])
  })

  it('ignores the resource when none is given', () => {
    expect(occupiedAt(entries, { ...query, start: '10:00', end: '11:00' })).toHaveLength(2)
  })

  it('reads other field names', () => {
    const rows = [{ room: 'a', day: '2026-03-02', from: '10:00', to: '11:00' }]
    const fields = { resource: 'room', date: 'day', start: 'from', end: 'to' }
    const request = { ...query, resource: 'a', start: '10:15', end: '10:45', fields }
    expect(occupiedAt(rows, request)).toEqual(rows)
  })

  it('answers nothing for an invalid request', () => {
    expect(occupiedAt(entries, { ...roomA, start: '25:00', end: '26:00' })).toEqual([])
  })

  it('compares real time across a daylight saving gap', () => {
    const rows = [{ resource: 'a', date: '2026-03-08', start: '01:00', end: '03:00' }]
    const request = { date: '2026-03-08', timeZone: 'America/New_York', resource: 'a' }
    expect(occupiedAt(rows, { ...request, start: '03:00', end: '04:00' })).toEqual([])
    expect(occupiedAt(rows, { ...request, start: '01:30', end: '02:30' })).toEqual(rows)
  })
})

describe('timeOfDay', () => {
  const schema = timeOfDay()

  it('accepts HH:mm', () => {
    expect(schema.parse('00:00')).toBe('00:00')
    expect(schema.parse('23:59')).toBe('23:59')
  })

  it.each(['24:00', '9:30', '12:60', '12:30:15', 'noon', ''])('rejects %s', (value) => {
    expect(schema.safeParse(value).success).toBe(false)
  })

  it('is marked for the admin', () => {
    const node = z.toJSONSchema(schema, { io: 'input' }) as Exclude<TranslatedNode, boolean>
    expect(classifyField(node)).toBe('timeOfDay')
  })
})

describe('bookingDuration', () => {
  it('holds a length to the minimum and maximum', () => {
    const schema = bookingDuration({ minDuration: 30, maxDuration: 120 })
    expect(schema.safeParse(30).success).toBe(true)
    expect(schema.safeParse(120).success).toBe(true)
    expect(schema.safeParse(29).success).toBe(false)
    expect(schema.safeParse(121).success).toBe(false)
  })

  it('leaves out a bound that is not set', () => {
    expect(bookingDuration({}).safeParse(1000).success).toBe(true)
    expect(bookingDuration({}).safeParse(0).success).toBe(false)
  })
})
