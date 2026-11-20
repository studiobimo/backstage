import { z } from 'zod'

import { TIME_OF_DAY } from './fields.ts'
import {
  type Instant,
  instantOfDateTime,
  isRealDate,
  millisecondsOf,
  slotsFor,
  type SlotOptions,
  wallTimeOf,
  type WeeklyHours,
  WEEKLY_HOURS
} from './weekly-hours.ts'

export const BOOKING = {
  fields: { resource: 'resource', date: 'date', start: 'start', end: 'end' },
  fallbackTimeZone: 'UTC'
} as const

export interface InstantRange {
  start: Instant
  end: Instant
}

export interface BookingFields {
  resource: string
  date: string
  start: string
  end: string
}

export interface OccupiedQuery {
  resource?: unknown
  date: string
  start: string
  end: string
  timeZone?: string
  fields?: Partial<BookingFields>
}

export interface DurationBounds {
  minDuration?: number
  maxDuration?: number
}

export const rangesOverlap = (a: InstantRange, b: InstantRange) =>
  millisecondsOf(a.start) < millisecondsOf(b.end) && millisecondsOf(b.start) < millisecondsOf(a.end)

const isWallTime = (value: unknown): value is string =>
  typeof value === 'string' && TIME_OF_DAY.pattern.test(value)

const isWallDate = (value: unknown): value is string =>
  typeof value === 'string' && isRealDate(value)

const nextDateOf = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + WEEKLY_HOURS.day.milliseconds)
    .toISOString()
    .slice(0, WEEKLY_HOURS.date.length)

function bookingRange(timeZone: string, date: unknown, start: unknown, end: unknown) {
  if (!isWallDate(date) || !isWallTime(start) || !isWallTime(end)) return undefined
  const endDate = end > start ? date : nextDateOf(date)
  return {
    start: instantOfDateTime(timeZone, date, start),
    end: instantOfDateTime(timeZone, endDate, end)
  }
}

export function occupiedAt(
  entries: readonly Record<string, unknown>[],
  query: OccupiedQuery
): Record<string, unknown>[] {
  const { timeZone = BOOKING.fallbackTimeZone } = query
  const fields = { ...BOOKING.fields, ...query.fields }
  const wanted = bookingRange(timeZone, query.date, query.start, query.end)
  if (!wanted) return []
  return entries.filter((entry) => {
    if (query.resource !== undefined && entry[fields.resource] !== query.resource) return false
    const taken = bookingRange(timeZone, entry[fields.date], entry[fields.start], entry[fields.end])
    return taken !== undefined && rangesOverlap(taken, wanted)
  })
}

export const bookingDuration = ({ minDuration, maxDuration }: DurationBounds) => {
  const base = z.number().int().positive()
  const atLeast = minDuration === undefined ? base : base.min(minDuration)
  return maxDuration === undefined ? atLeast : atLeast.max(maxDuration)
}

export interface BookableQuery extends SlotOptions {
  duration: number
  resource?: unknown
  fields?: Partial<BookingFields>
}

export interface BookableSlot {
  date: string
  start: string
  end: string
}

export function bookableSlots(
  hours: WeeklyHours,
  entries: readonly Record<string, unknown>[],
  date: string,
  { resource, fields, ...slotOptions }: BookableQuery
): BookableSlot[] {
  const { timeZone } = hours
  const durationMilliseconds = slotOptions.duration * WEEKLY_HOURS.minute.milliseconds
  return slotsFor(hours, date, slotOptions).flatMap((begin) => {
    const from = wallTimeOf(timeZone, begin)
    const until = wallTimeOf(timeZone, begin.getTime() + durationMilliseconds)
    const request = {
      resource,
      date: from.date,
      start: from.time,
      end: until.time,
      timeZone,
      fields
    }
    return occupiedAt(entries, request).length === 0
      ? [{ date: from.date, start: from.time, end: until.time }]
      : []
  })
}
