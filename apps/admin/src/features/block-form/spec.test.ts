import { describe, expect, it } from 'vitest'

import {
  type FieldSpec,
  type JsonSchema,
  parseBlockSchema,
  UnsupportedSchemaError
} from './spec.ts'
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

  it('reads text and its limits', () => {
    expect(byKey('slug')).toMatchObject({ kind: 'text', required: true, maxLength: 5 })
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

  it('refuses a shape it cannot render', () => {
    expect(() => parseBlockSchema({ type: 'object', properties: { x: { type: 'null' } } })).toThrow(
      UnsupportedSchemaError
    )
    expect(() => parseBlockSchema({ type: 'string' })).toThrow(UnsupportedSchemaError)
  })

  it('refuses localized fields and rich text, which the form cannot edit yet', () => {
    const refuses = (field: JsonSchema) =>
      expect(() => parseBlockSchema({ type: 'object', properties: { field } })).toThrow(
        UnsupportedSchemaError
      )
    refuses({ type: 'object', backstage: 'localized', additionalProperties: { type: 'string' } })
    refuses({ type: 'object', backstage: 'richText' })
  })
})

const validator = blockValidator(everyKindSchema)

const incomplete = {
  cta: { href: '' },
  picture: { id: 'x' },
  size: 'xl',
  columns: 7.5,
  slug: 'Ab1',
  items: [],
  details: {}
}

const complete = {
  cta: { href: '/about', label: undefined },
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
      everyKind.parse({ ...complete, cta: { href: '/about' } })
    )
  })
})
