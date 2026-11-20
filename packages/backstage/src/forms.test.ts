import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry } from './blocks.ts'
import { defineCollection } from './collections.ts'
import { defineForm, FORM, formsOf, initialStatusOf, tokenDaysOf } from './forms.ts'
import { entries } from './references.ts'

const menu = defineCollection({
  name: 'menu',
  label: 'name',
  schema: z.object({ name: z.string() })
})

const schema = z.object({
  name: z.string().min(1),
  seats: z.number().int().min(1),
  dishes: entries(menu, { max: 3 }).optional()
})

describe('defineForm', () => {
  it('gives a form the default statuses, no public fields and Turnstile', () => {
    const form = defineForm('reservation', { schema })
    expect(form.statuses).toEqual(FORM.defaultStatuses)
    expect(initialStatusOf(form)).toBe('new')
    expect(form.public).toEqual({ statuses: [], fields: [] })
    expect(form.turnstile).toBe(true)
  })

  it('keeps the statuses, the public part and the notification it is given', () => {
    const form = defineForm('reservation', {
      schema,
      statuses: ['pending', 'seated'],
      public: { statuses: ['seated'], fields: ['seats'] },
      notify: { to: ['owner@example.com'], subject: 'Table request' },
      turnstile: false
    })
    expect(form.statuses).toEqual(['pending', 'seated'])
    expect(form.public).toEqual({ statuses: ['seated'], fields: ['seats'] })
    expect(form.notify).toEqual({ to: ['owner@example.com'], subject: 'Table request' })
    expect(form.turnstile).toBe(false)
  })

  it.each(['Reservation', 'two words', '1form', ''])('refuses the name "%s"', (name) => {
    expect(() => defineForm(name, { schema })).toThrow(/lowercase letters/)
  })

  it('refuses a schema that is not an object', () => {
    expect(() => defineForm('plain', { schema: z.string() })).toThrow(/z.object/)
  })

  it('refuses a schema the admin cannot render', () => {
    const union = z.object({ either: z.union([z.string(), z.number()]) })
    expect(() => defineForm('either', { schema: union })).toThrow(/cannot render/)
  })

  it.each([
    [[], /between 1 and/],
    [['new', 'new'], /twice/],
    [['New'], /lowercase letters/]
  ])('refuses the statuses %j', (statuses, message) => {
    expect(() => defineForm('reservation', { schema, statuses })).toThrow(message)
  })

  it('refuses a public status the form does not have', () => {
    expect(() => defineForm('reservation', { schema, public: { statuses: ['seated'] } })).toThrow(
      /public status "seated"/
    )
  })

  it('refuses a public field the schema does not have', () => {
    expect(() =>
      defineForm('reservation', { schema, public: { fields: ['phone' as 'seats'] } })
    ).toThrow(/public field "phone"/)
  })

  it('refuses a notification address that is not an email', () => {
    expect(() => defineForm('reservation', { schema, notify: { to: ['nobody'] } })).toThrow(
      /not an email/
    )
    expect(() => defineForm('reservation', { schema, notify: { to: [] } })).toThrow(/needs an/)
  })
})

describe('a registry with forms', () => {
  const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

  it('indexes the forms by name', () => {
    const form = defineForm('reservation', { schema })
    const registry = defineRegistry([note], { collections: [menu], forms: [form] })
    expect(registry.getForm('reservation')).toBe(form)
    expect(formsOf(registry).size).toBe(1)
  })

  it('has no forms by default', () => {
    expect(formsOf(defineRegistry([note])).size).toBe(0)
  })

  it('refuses two forms with one name', () => {
    const form = defineForm('reservation', { schema })
    expect(() => defineRegistry([note], { collections: [menu], forms: [form, form] })).toThrow(
      /registered twice/
    )
  })

  it('refuses a form field that refers to a collection the registry lacks', () => {
    const form = defineForm('reservation', { schema })
    expect(() => defineRegistry([note], { forms: [form] })).toThrow(
      /Form "reservation" field "dishes" refers to the unknown collection "menu"/
    )
  })
})

describe('defineForm token and retention', () => {
  it('expires the status token after the default days, and keeps no retention', () => {
    const form = defineForm('reservation', { schema })
    expect(tokenDaysOf(form)).toBe(FORM.token.defaultExpiresInDays)
    expect(form.token).toEqual({ expiresInDays: FORM.token.defaultExpiresInDays })
    expect(form.retention).toBeUndefined()
  })

  it('keeps the token expiry and the retention it is given', () => {
    const form = defineForm('reservation', {
      schema,
      token: { expiresInDays: 7 },
      retention: { days: 90 }
    })
    expect(tokenDaysOf(form)).toBe(7)
    expect(form.retention).toEqual({ days: 90 })
  })

  it.each([0, -1, 1.5, FORM.limits.maxDays + 1])('refuses %s days', (days) => {
    expect(() => defineForm('reservation', { schema, token: { expiresInDays: days } })).toThrow(
      /token.expiresInDays/
    )
    expect(() => defineForm('reservation', { schema, retention: { days } })).toThrow(
      /retention.days/
    )
  })
})
