import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  NumberFieldValue,
  SelectFieldValue,
  SwitchFieldValue,
  TextFieldValue
} from '@/components/form/fields'

import { parseBlockSchema } from './spec.ts'
import { everyKindSchema } from './test-fixtures.ts'
import { fieldName, initialGroup, type ValueByKind, withoutUndefined } from './value.ts'

describe('initialGroup', () => {
  const initial = initialGroup(parseBlockSchema(everyKindSchema))

  it('starts required text empty and optional fields absent', () => {
    expect(initial.slug).toBe('')
    expect(initial).not.toHaveProperty('ratio')
  })

  it('uses the defaults the schema gives', () => {
    expect(initial.theme).toBe('light')
  })

  it('starts required groups with their required text', () => {
    expect(initial.cta).toEqual({ href: '', label: '' })
    expect(initial.details).toEqual({})
  })
})

describe('value helpers', () => {
  it('names a path the way the form names its fields', () => {
    expect(fieldName(['items', 0, 'title', 'es'])).toBe('items[0].title.es')
    expect(fieldName(['slug'])).toBe('slug')
  })

  it('drops undefined entries the way JSON would', () => {
    expect(withoutUndefined({ a: undefined, b: [{ c: undefined, d: 1 }] })).toEqual({
      b: [{ d: 1 }]
    })
  })
})

describe('the control for each field kind', () => {
  it('edits exactly the value that kind stores', () => {
    expectTypeOf<TextFieldValue>().toEqualTypeOf<ValueByKind['text'] | undefined>()
    expectTypeOf<NumberFieldValue>().toEqualTypeOf<ValueByKind['number'] | undefined>()
    expectTypeOf<SwitchFieldValue>().toEqualTypeOf<ValueByKind['boolean'] | undefined>()
    expectTypeOf<SelectFieldValue>().toEqualTypeOf<ValueByKind['select'] | undefined>()
  })
})
