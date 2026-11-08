import { describe, expect, it } from 'vitest'

import { parseBlockSchema, UnsupportedSchemaError, type FieldSpec } from './spec.ts'
import { everyKind, everyKindSchema } from './test-fixtures.ts'
import { blockValidator } from './validation.ts'

const fields = parseBlockSchema(everyKindSchema).fields
const byKey = (key: string): FieldSpec => {
  const field = fields.find((candidate) => candidate.key === key)
  if (!field) throw new Error(`no field ${key}`)
  return field
}

describe('parseBlockSchema', () => {
  it('keeps the fields in schema order', () => {
    expect(fields.map((field) => field.key)).toEqual(Object.keys(everyKindSchema.properties ?? {}))
  })

  it('reads text, rich text and their limits', () => {
    expect(byKey('slug')).toMatchObject({ kind: 'text', required: true, maxLength: 5 })
    expect(byKey('note')).toMatchObject({ kind: 'richText', required: false })
  })

  it('reads numbers, booleans and selects', () => {
    expect(byKey('columns')).toMatchObject({
      kind: 'number',
      integer: true,
      minimum: 1,
      maximum: 4
    })
    expect(byKey('ratio')).toMatchObject({ kind: 'number', integer: false, required: false })
    expect(byKey('featured')).toMatchObject({ kind: 'boolean' })
    expect(byKey('theme')).toMatchObject({
      kind: 'select',
      options: ['light', 'dark'],
      defaultValue: 'light',
      required: false
    })
  })

  it('reads image and link as marked groups', () => {
    expect(byKey('picture')).toMatchObject({ kind: 'group', variant: 'image' })
    expect(byKey('cta')).toMatchObject({ kind: 'group', variant: 'link' })
  })

  it('reads lists and nested groups', () => {
    expect(byKey('items')).toMatchObject({
      kind: 'list',
      minItems: 1,
      maxItems: 2,
      item: { kind: 'group' }
    })
    expect(byKey('details')).toMatchObject({
      kind: 'group',
      fields: [{ key: 'credit', kind: 'text' }]
    })
  })

  it('reads a localized field with the kind it wraps', () => {
    expect(byKey('title')).toMatchObject({
      kind: 'localized',
      inner: { kind: 'text', minLength: 1 }
    })
    expect(byKey('body')).toMatchObject({ kind: 'localized', inner: { kind: 'richText' } })
    expect(byKey('alt')).toMatchObject({
      kind: 'localized',
      required: false,
      inner: { kind: 'group', variant: 'link' }
    })
  })

  it('refuses a shape it cannot render', () => {
    expect(() => parseBlockSchema({ type: 'object', properties: { x: { type: 'null' } } })).toThrow(
      UnsupportedSchemaError
    )
    expect(() => parseBlockSchema({ type: 'string' })).toThrow(UnsupportedSchemaError)
  })
})

const validator = blockValidator(everyKindSchema)

const incomplete = {
  title: { en: '' },
  cta: { href: '' },
  picture: { id: 'x' },
  size: 'xl',
  columns: 7.5,
  slug: 'Ab1',
  items: [],
  details: {}
}

const complete = {
  title: { en: 'Hello', es: undefined },
  body: {},
  cta: { href: '/about' },
  picture: { id: 'img-1' },
  size: 'm',
  columns: 3,
  slug: 'abc',
  items: [{ name: 'One' }],
  details: {}
}

const issuesOf = (result: { error?: { issues: { path: PropertyKey[]; code: string }[] } }) =>
  result.error?.issues.map(({ path, code }) => ({ path, code }))

describe('blockValidator', () => {
  it('reports the same issues as the block schema the API validates with', () => {
    expect(issuesOf(validator.safeParse(incomplete))).toEqual(
      issuesOf(everyKind.safeParse(incomplete))
    )
  })

  it('accepts what the block schema accepts, with its defaults applied', () => {
    expect(validator.parse(complete)).toEqual(
      everyKind.parse({ ...complete, title: { en: 'Hello' } })
    )
  })
})
