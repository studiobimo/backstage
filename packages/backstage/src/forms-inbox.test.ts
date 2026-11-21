import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineForm, inboxOf } from './forms.ts'
import { INBOX } from './form-inbox.ts'
import { money } from './money.ts'

const schema = z.object({
  name: z.string(),
  date: z.string(),
  time: z.string(),
  items: z.array(z.object({ label: z.string(), price: money() })),
  tags: z.array(z.string())
})

describe('the inbox of a form', () => {
  it('has no declared columns and no total by default', () => {
    expect(inboxOf(defineForm('contact', { schema }))).toEqual({ columns: [] })
  })

  it('keeps single fields and date and time pairs as columns', () => {
    const form = defineForm('contact', {
      schema,
      inbox: { columns: ['name', ['date', 'time']], total: { field: 'items', money: 'price' } }
    })
    expect(inboxOf(form)).toEqual({
      columns: [['name'], ['date', 'time']],
      total: { field: 'items', money: 'price' }
    })
  })

  it('refuses a column that is not a field of the schema', () => {
    expect(() => defineForm('contact', { schema, inbox: { columns: ['nope' as 'name'] } })).toThrow(
      'inbox column "nope"'
    )
  })

  it('refuses more columns than the inbox can show', () => {
    const columns = Array.from({ length: INBOX.columns.maxCount + 1 }, () => 'name' as const)
    expect(() => defineForm('contact', { schema, inbox: { columns } })).toThrow('at most')
  })

  it.each([
    ['a field that is not a list', { field: 'name', money: 'price' }],
    ['a list without that money field', { field: 'items', money: 'label' }],
    ['a list of plain values', { field: 'tags', money: 'price' }]
  ])('refuses a total over %s', (_name, total) => {
    expect(() =>
      defineForm('contact', {
        schema,
        inbox: { total: total as { field: 'items'; money: string } }
      })
    ).toThrow('inbox total')
  })
})
