import { z } from 'zod'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'

import { issueMessage } from './field-error.ts'

const t = i18n.getFixedT(null, 'form')
const issueOf = (schema: z.ZodType, input: unknown) => schema.safeParse(input).error?.issues[0]
const message = (schema: z.ZodType, input: unknown, blank = false) =>
  issueMessage(t, issueOf(schema, input), blank)

describe('issueMessage', () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('names the limit a value breaks', () => {
    expect(message(z.string().max(5), 'abcdefg')).toBe('Use 5 characters or fewer.')
    expect(message(z.number().max(4), 9)).toBe('Enter 4 or less.')
    expect(message(z.number().int(), 1.5)).toBe('Enter a whole number.')
    expect(message(z.array(z.string()).min(2), [])).toBe('Add at least 2 items.')
    expect(message(z.enum(['a', 'b']), 'c')).toBe('Choose one of the options.')
    expect(message(z.string().regex(/^[a-z]+$/), 'A1')).toBe('Enter a valid value.')
    expect(message(z.email(), 'nope')).toBe('Enter a valid email address.')
  })

  it('says a blank field is required, whatever rule it breaks', () => {
    expect(message(z.string().regex(/^[a-z]+$/), '', true)).toBe('This field is required.')
    expect(message(z.string().min(1), '')).toBe('This field is required.')
  })

  it('speaks the editor language', async () => {
    await i18n.changeLanguage('es')
    expect(issueMessage(i18n.getFixedT(null, 'form'), issueOf(z.number().max(4), 9), false)).toBe(
      'Escribe 4 o menos.'
    )
  })

  it('ignores errors that are not schema issues', () => {
    expect(issueMessage(t, 'boom', false)).toBeUndefined()
  })
})
