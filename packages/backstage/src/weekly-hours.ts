import { z } from 'zod'

import { marked, minutesOfTime, TIME_OF_DAY, timeOfDaySchema } from './fields.ts'
import { WEEKDAYS } from './field-shapes.ts'

export const WEEKLY_HOURS = {
  date: { pattern: /^\d{4}-\d{2}-\d{2}$/, length: 10 },
  day: { minutes: 1440, milliseconds: 86_400_000, daysPerWeek: 7 },
  minute: { milliseconds: 60_000 },
  second: { milliseconds: 1000 },
  search: { maxDays: 400 },
  state: { open: 'open', beforeOpening: 'before-opening', closed: 'closed' },
  issue: {
    emptyRange: 'A range must not open and close at the same time',
    timeZone: 'Not a valid IANA time zone',
    duplicateDate: 'An exception date appears twice'
  }
} as const

export type OpenState = (typeof WEEKLY_HOURS.state)[keyof typeof WEEKLY_HOURS.state]

export const isRealDate = (value: string) =>
  WEEKLY_HOURS.date.pattern.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)

const isTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

const hoursRange = z
  .object({ open: timeOfDaySchema, close: timeOfDaySchema })
  .refine((range) => range.open !== range.close, { message: WEEKLY_HOURS.issue.emptyRange })

const dayRanges = z.array(hoursRange).default([])

const weekShape = Object.fromEntries(WEEKDAYS.map((day) => [day, dayRanges])) as Record<
  (typeof WEEKDAYS)[number],
  typeof dayRanges
>

const hoursException = z.object({
  date: z.string().refine(isRealDate),
  ranges: z.array(hoursRange).default([])
})

const hasUniqueDates = (exceptions: { date: string }[]) =>
  new Set(exceptions.map((exception) => exception.date)).size === exceptions.length

export const weeklyHours = () =>
  marked(
    z.object({
      timeZone: z.string().refine(isTimeZone, { message: WEEKLY_HOURS.issue.timeZone }),
      week: z.object(weekShape),
      exceptions: z
        .array(hoursException)
        .default([])
        .refine(hasUniqueDates, { message: WEEKLY_HOURS.issue.duplicateDate })
    }),
    'weeklyHours'
  )

export type WeeklyHours = z.output<ReturnType<typeof weeklyHours>>
export type HoursRange = z.output<typeof hoursRange>
export type Instant = Date | number

const wallFormatters = new Map<string, Intl.DateTimeFormat>()

function wallFormatter(timeZone: string) {
  const cached = wallFormatters.get(timeZone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  wallFormatters.set(timeZone, created)
  return created
}

export const millisecondsOf = (instant: Instant) =>
  instant instanceof Date ? instant.getTime() : instant

function wallClockOf(timeZone: string, instant: number) {
  const parts: Record<string, number> = {}
  for (const part of wallFormatter(timeZone).formatToParts(instant)) {
    parts[part.type] = Number(part.value)
  }
  const { year, month, day, hour, minute, second } = parts
  return Date.UTC(year!, month! - 1, day!, hour!, minute!, second!)
}

function instantOfWallClock(timeZone: string, wallClock: number) {
  const offsetAt = (guess: number) =>
    wallClockOf(timeZone, guess) -
    Math.floor(guess / WEEKLY_HOURS.second.milliseconds) * WEEKLY_HOURS.second.milliseconds
  return wallClock - offsetAt(wallClock - offsetAt(wallClock))
}

const dayIndexOf = (wallClock: number) => Math.floor(wallClock / WEEKLY_HOURS.day.milliseconds)

const dateOfDay = (dayIndex: number) =>
  new Date(dayIndex * WEEKLY_HOURS.day.milliseconds).toISOString().slice(0, 10)

const weekdayOfDay = (dayIndex: number) => {
  const sundayFirst = new Date(dayIndex * WEEKLY_HOURS.day.milliseconds).getUTCDay()
  return WEEKDAYS[(sundayFirst + WEEKLY_HOURS.day.daysPerWeek - 1) % WEEKLY_HOURS.day.daysPerWeek]!
}

function rangesOnDay(hours: WeeklyHours, dayIndex: number): HoursRange[] {
  const exception = hours.exceptions.find((candidate) => candidate.date === dateOfDay(dayIndex))
  return exception ? exception.ranges : hours.week[weekdayOfDay(dayIndex)]
}

function spanOf(dayIndex: number, range: HoursRange) {
  const opens = minutesOfTime(range.open)
  const closes = minutesOfTime(range.close)
  const base = dayIndex * WEEKLY_HOURS.day.milliseconds
  const spill = closes > opens ? 0 : WEEKLY_HOURS.day.minutes
  return {
    start: base + opens * WEEKLY_HOURS.minute.milliseconds,
    end: base + (closes + spill) * WEEKLY_HOURS.minute.milliseconds
  }
}

const spansOnDay = (hours: WeeklyHours, dayIndex: number) =>
  rangesOnDay(hours, dayIndex)
    .map((range) => spanOf(dayIndex, range))
    .sort((a, b) => a.start - b.start)

export function isOpenAt(hours: WeeklyHours, instant: Instant): OpenState {
  const wallClock = wallClockOf(hours.timeZone, millisecondsOf(instant))
  const today = dayIndexOf(wallClock)
  const todaySpans = spansOnDay(hours, today)
  const isOpen = [...spansOnDay(hours, today - 1), ...todaySpans].some(
    (span) => span.start <= wallClock && wallClock < span.end
  )
  if (isOpen) return WEEKLY_HOURS.state.open
  const opensLater = todaySpans.some((span) => span.start > wallClock)
  return opensLater ? WEEKLY_HOURS.state.beforeOpening : WEEKLY_HOURS.state.closed
}

export function nextOpening(hours: WeeklyHours, instant: Instant): Date | undefined {
  const wallClock = wallClockOf(hours.timeZone, millisecondsOf(instant))
  const today = dayIndexOf(wallClock)
  for (let offset = 0; offset < WEEKLY_HOURS.search.maxDays; offset++) {
    const next = spansOnDay(hours, today + offset).find((span) => span.start > wallClock)
    if (next) return new Date(instantOfWallClock(hours.timeZone, next.start))
  }
  return undefined
}

export interface SlotOptions {
  step: number
  leadTime?: number
  now?: Instant
  duration?: number
}

export function wallTimeOf(timeZone: string, instant: Instant) {
  const iso = new Date(wallClockOf(timeZone, millisecondsOf(instant))).toISOString()
  const timeStart = WEEKLY_HOURS.date.length + 1
  return {
    date: iso.slice(0, WEEKLY_HOURS.date.length),
    time: iso.slice(timeStart, timeStart + TIME_OF_DAY.length)
  }
}

export const instantOfDateTime = (timeZone: string, date: string, time: string) =>
  instantOfWallClock(
    timeZone,
    Date.parse(`${date}T00:00:00Z`) + minutesOfTime(time) * WEEKLY_HOURS.minute.milliseconds
  )

export function slotsFor(hours: WeeklyHours, date: string, options: SlotOptions): Date[] {
  const { step, leadTime = 0, now = Date.now(), duration = 0 } = options
  if (!isRealDate(date) || !(step > 0) || duration < 0) return []
  const earliest = millisecondsOf(now) + leadTime * WEEKLY_HOURS.minute.milliseconds
  const stepMilliseconds = step * WEEKLY_HOURS.minute.milliseconds
  const durationMilliseconds = duration * WEEKLY_HOURS.minute.milliseconds
  const starts = new Set<number>()
  for (const span of spansOnDay(hours, dayIndexOf(Date.parse(`${date}T00:00:00Z`)))) {
    const closing = instantOfWallClock(hours.timeZone, span.end)
    for (let at = span.start; at < span.end; at += stepMilliseconds) {
      const instant = instantOfWallClock(hours.timeZone, at)
      if (instant >= earliest && instant + durationMilliseconds <= closing) starts.add(instant)
    }
  }
  return [...starts].sort((a, b) => a - b).map((start) => new Date(start))
}
