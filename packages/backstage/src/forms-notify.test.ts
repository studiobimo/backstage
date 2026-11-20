import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineForm } from './forms.ts'
import { SUBMISSION_TEXT, submissionStringsFor } from './submission-text.ts'

const schema = z.object({ name: z.string(), phone: z.string() })

describe('a form notification', () => {
  it('refuses an excluded field that is not in the schema', () => {
    expect(() =>
      defineForm('contact', { schema, notify: { exclude: ['nope'] as unknown as 'phone'[] } })
    ).toThrow('notify.exclude "nope"')
  })

  it('accepts a subject function and field limits', () => {
    const form = defineForm('contact', {
      schema,
      notify: { subject: () => 'Hi', include: ['name'], exclude: ['phone'] }
    })
    expect(form.notify?.include).toEqual(['name'])
  })
})

describe('the strings of a submission', () => {
  it('has the same keys in every language', () => {
    const shape = (strings: object): string[] =>
      Object.entries(strings).flatMap(([key, value]) =>
        typeof value === 'object' ? shape(value).map((child) => `${key}.${child}`) : [key]
      )
    const [english, ...others] = Object.values(SUBMISSION_TEXT).map(shape)
    for (const keys of others) expect(keys).toEqual(english)
  })

  it('falls back to English for a language it does not have', () => {
    expect(submissionStringsFor('fr')).toBe(SUBMISSION_TEXT.en)
    expect(submissionStringsFor('es-MX')).toBe(SUBMISSION_TEXT.es)
  })
})
