import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  NumberFieldValue,
  SelectFieldValue,
  SwitchFieldValue,
  TextFieldValue
} from '@/components/form/fields'

import type { RichTextFieldValue } from './rich-text-field.tsx'

import { parseBlockSchema } from './spec.ts'
import { everyKindSchema } from './test-fixtures.ts'
import {
  fieldName,
  initialGroup,
  isWithinPath,
  summarize,
  type ValueByKind,
  withoutUndefined
} from './value.ts'

describe('initialGroup', () => {
  const initial = initialGroup(parseBlockSchema(everyKindSchema))

  it('starts required text empty and optional fields absent', () => {
    expect(initial.slug).toBe('')
    expect(initial).not.toHaveProperty('note')
    expect(initial).not.toHaveProperty('ratio')
  })

  it('starts localized fields and lists empty, and uses defaults', () => {
    expect(initial.title).toEqual({})
    expect(initial.items).toEqual([])
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

  it('tells what is inside a path by its delimiters, not its prefix', () => {
    expect(isWithinPath('items[1]', 'items[1]')).toBe(true)
    expect(isWithinPath('items[1].name', 'items[1]')).toBe(true)
    expect(isWithinPath('items[1][0]', 'items[1]')).toBe(true)
    expect(isWithinPath('items[10]', 'items[1]')).toBe(false)
    expect(isWithinPath('items[10].name', 'items[1]')).toBe(false)
    expect(isWithinPath('titles', 'title')).toBe(false)
  })

  it('drops undefined entries the way JSON would', () => {
    expect(withoutUndefined({ a: undefined, b: [{ c: undefined, d: 1 }] })).toEqual({
      b: [{ d: 1 }]
    })
  })

  it('reads rich text as its plain text', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }]
    }
    expect(summarize(doc)).toBe('Hola')
  })

  it('summarizes a value as one line of text', () => {
    expect(summarize({ href: '/about', label: 'About' })).toBe('/about · About')
    expect(summarize(3)).toBe('3')
    expect(summarize(true)).toBe('')
  })
})

describe('the control for each field kind', () => {
  it('edits exactly the value that kind stores', () => {
    expectTypeOf<TextFieldValue>().toEqualTypeOf<ValueByKind['text'] | undefined>()
    expectTypeOf<RichTextFieldValue>().toEqualTypeOf<ValueByKind['richText'] | undefined>()
    expectTypeOf<NumberFieldValue>().toEqualTypeOf<ValueByKind['number'] | undefined>()
    expectTypeOf<SwitchFieldValue>().toEqualTypeOf<ValueByKind['boolean'] | undefined>()
    expectTypeOf<SelectFieldValue>().toEqualTypeOf<ValueByKind['select'] | undefined>()
  })
})
