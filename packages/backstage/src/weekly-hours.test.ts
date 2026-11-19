import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineRegistry } from './blocks.ts'
import { classifyField } from './field-shapes.ts'
import type { TranslatedNode } from './translations.ts'
import { isOpenAt, nextOpening, slotsFor, weeklyHours, type WeeklyHours } from './weekly-hours.ts'

const parse = (input: unknown): WeeklyHours => weeklyHours().parse(input)

const bakery = parse({
  timeZone: 'America/Mexico_City',
  week: {
    monday: [{ open: '09:00', close: '17:00' }],
    tuesday: [
      { open: '09:00', close: '13:00' },
      { open: '15:00', close: '19:00' }
    ],
    friday: [{ open: '20:00', close: '02:00' }]
  },
  exceptions: [
    { date: '2025-12-25', ranges: [] },
    { date: '2025-12-24', ranges: [{ open: '10:00', close: '12:00' }] }
  ]
})

const at = (iso: string) => new Date(iso)

describe('weeklyHours', () => {
  it('fills missing days and exceptions with empty lists', () => {
    const hours = parse({ timeZone: 'Europe/Madrid', week: {} })
    expect(hours.week.sunday).toEqual([])
    expect(hours.exceptions).toEqual([])
  })

  it('is marked for the admin', () => {
    const node = z.toJSONSchema(weeklyHours(), { io: 'input' }) as Exclude<TranslatedNode, boolean>
    expect(classifyField(node)).toBe('weeklyHours')
  })

  it('works as a registry settings field', () => {
    const settings = z.object({ hours: weeklyHours() })
    const registry = defineRegistry([], { settings })
    const hours = registry.settingsJsonSchema()?.properties?.hours as TranslatedNode
    expect(classifyField(hours as Exclude<TranslatedNode, boolean>)).toBe('weeklyHours')
  })

  it.each([
    ['an unknown time zone', { timeZone: 'Mars/Base', week: {} }],
    ['a malformed time', { timeZone: 'UTC', week: { monday: [{ open: '9:00', close: '17:00' }] } }],
    ['an empty range', { timeZone: 'UTC', week: { monday: [{ open: '09:00', close: '09:00' }] } }],
    ['an impossible date', { timeZone: 'UTC', week: {}, exceptions: [{ date: '2025-02-30' }] }],
    [
      'a repeated date',
      {
        timeZone: 'UTC',
        week: {},
        exceptions: [
          { date: '2025-01-01', ranges: [] },
          { date: '2025-01-01', ranges: [] }
        ]
      }
    ]
  ])('rejects %s', (_name, input) => {
    expect(weeklyHours().safeParse(input).success).toBe(false)
  })
})

describe('isOpenAt', () => {
  it('judges in the business time zone, not the UTC day', () => {
    expect(isOpenAt(bakery, at('2025-03-03T16:00:00Z'))).toBe('open')
    expect(isOpenAt(bakery, at('2025-03-03T14:00:00Z'))).toBe('before-opening')
    expect(isOpenAt(bakery, at('2025-03-04T01:00:00Z'))).toBe('closed')
  })

  it('reports before-opening between two ranges and closed on a day without ranges', () => {
    expect(isOpenAt(bakery, at('2025-03-04T20:00:00Z'))).toBe('before-opening')
    expect(isOpenAt(bakery, at('2025-03-05T18:00:00Z'))).toBe('closed')
  })

  it('treats the close as exclusive and the open as inclusive', () => {
    expect(isOpenAt(bakery, at('2025-03-03T15:00:00Z'))).toBe('open')
    expect(isOpenAt(bakery, at('2025-03-03T23:00:00Z'))).toBe('closed')
  })

  it('carries a range past midnight into the next day', () => {
    expect(isOpenAt(bakery, at('2025-03-08T07:00:00Z'))).toBe('open')
    expect(isOpenAt(bakery, at('2025-03-08T08:30:00Z'))).toBe('closed')
  })

  it('lets an exception replace the weekday', () => {
    expect(isOpenAt(bakery, at('2025-12-25T18:00:00Z'))).toBe('closed')
    expect(isOpenAt(bakery, at('2025-12-24T17:00:00Z'))).toBe('open')
  })

  it('accepts a timestamp in milliseconds', () => {
    expect(isOpenAt(bakery, at('2025-03-03T16:00:00Z').getTime())).toBe('open')
  })
})

describe('nextOpening', () => {
  it('finds the next range today, then the next day', () => {
    expect(nextOpening(bakery, at('2025-03-04T16:00:00Z'))).toEqual(at('2025-03-04T21:00:00Z'))
    expect(nextOpening(bakery, at('2025-03-04T23:00:00Z'))).toEqual(at('2025-03-08T02:00:00Z'))
  })

  it('skips an exception that closes a day', () => {
    const hours = parse({
      timeZone: 'UTC',
      week: { monday: [{ open: '09:00', close: '10:00' }] },
      exceptions: [{ date: '2025-03-10', ranges: [] }]
    })
    expect(nextOpening(hours, at('2025-03-03T12:00:00Z'))).toEqual(at('2025-03-17T09:00:00Z'))
  })

  it('is undefined for a business that never opens', () => {
    const never = parse({ timeZone: 'UTC', week: {} })
    expect(nextOpening(never, at('2025-03-03T12:00:00Z'))).toBeUndefined()
  })

  it('follows a daylight saving change', () => {
    const hours = parse({
      timeZone: 'Europe/Madrid',
      week: { monday: [{ open: '09:00', close: '17:00' }] }
    })
    expect(nextOpening(hours, at('2025-03-23T12:00:00Z'))).toEqual(at('2025-03-24T08:00:00Z'))
    expect(nextOpening(hours, at('2025-03-30T12:00:00Z'))).toEqual(at('2025-03-31T07:00:00Z'))
  })
})

describe('slotsFor', () => {
  const now = at('2025-03-01T00:00:00Z')

  it('steps through every range of the date', () => {
    const slots = slotsFor(bakery, '2025-03-04', { step: 120, now })
    expect(slots.map((slot) => slot.toISOString())).toEqual([
      '2025-03-04T15:00:00.000Z',
      '2025-03-04T17:00:00.000Z',
      '2025-03-04T21:00:00.000Z',
      '2025-03-04T23:00:00.000Z'
    ])
  })

  it('drops slots inside the lead time', () => {
    const slots = slotsFor(bakery, '2025-03-03', {
      step: 60,
      leadTime: 90,
      now: at('2025-03-03T17:00:00Z')
    })
    expect(slots[0]).toEqual(at('2025-03-03T19:00:00Z'))
  })

  it('runs past midnight for an overnight range', () => {
    const slots = slotsFor(bakery, '2025-03-07', { step: 120, now })
    expect(slots.at(-1)).toEqual(at('2025-03-08T06:00:00Z'))
  })

  it('is empty for a closed day, an invalid date or a bad step', () => {
    expect(slotsFor(bakery, '2025-03-05', { step: 30, now })).toEqual([])
    expect(slotsFor(bakery, 'tomorrow', { step: 30, now })).toEqual([])
    expect(slotsFor(bakery, '2025-03-03', { step: 0, now })).toEqual([])
  })
})
