import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { isWeeklyHours } from './field-shapes.ts'
import { localized } from './fields.ts'
import { labeled, labelsFor } from './labels.ts'
import type { TranslatedNode } from './translations.ts'

const jsonOf = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input' }) as Exclude<TranslatedNode, boolean>

const day = () => z.object({ closed: z.boolean(), opens: z.string(), closes: z.string() })

const week = (keys: readonly string[]) =>
  z.object(Object.fromEntries(keys.map((key) => [key, day()])))

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

describe('labeled', () => {
  it('writes the labels of every locale into the JSON schema', () => {
    const schema = z.object({
      seats: labeled(z.number(), { en: { title: 'Seats' }, es: { title: 'Comensales' } })
    })
    const seats = jsonOf(schema).properties?.seats as { labels?: unknown }
    expect(seats.labels).toEqual({ en: { title: 'Seats' }, es: { title: 'Comensales' } })
  })

  it('keeps the marker of a field that already has metadata', () => {
    const field = labeled(localized(z.string()), { en: { title: 'Note' } })
    expect(jsonOf(field).backstage).toBe('localized')
  })
})

describe('labelsFor', () => {
  const node = {
    title: 'Plain',
    description: 'Plain description',
    labels: { en: { title: 'Seats' }, es: { title: 'Comensales', description: 'Personas' } }
  }

  it('prefers the current language', () => {
    expect(labelsFor(node, 'es', 'en')).toEqual({ title: 'Comensales', description: 'Personas' })
  })

  it('falls back to the default locale, then the plain title', () => {
    expect(labelsFor(node, 'fr', 'en').title).toBe('Seats')
    expect(labelsFor({ title: 'Plain' }, 'fr', 'en').title).toBe('Plain')
    expect(labelsFor({}, 'fr', 'en').title).toBeUndefined()
  })
})

describe('isWeeklyHours', () => {
  it('recognises an object keyed by the seven weekdays with open and close times', () => {
    expect(isWeeklyHours(jsonOf(week(DAYS)))).toBe(true)
  })

  it('rejects a week with a missing day or an unrelated shape', () => {
    expect(isWeeklyHours(jsonOf(week(DAYS.slice(1))))).toBe(false)
    expect(isWeeklyHours(jsonOf(z.object({ slotMinutes: z.number() })))).toBe(false)
    expect(
      isWeeklyHours(jsonOf(z.object(Object.fromEntries(DAYS.map((d) => [d, z.string()])))))
    ).toBe(false)
  })
})
