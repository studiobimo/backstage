import type { FieldKind } from '@studiobimo/backstage'
import type { z } from 'zod'

import type { FieldValue } from './value.ts'

export type JsonSchema = {
  type?: z.core.JSONSchema.SchemaType
  title?: string
  description?: string
  default?: FieldValue
  enum?: (string | number)[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  additionalProperties?: JsonSchema
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  backstage?: FieldKind
}

interface Common {
  key: string
  title?: string
  description?: string
  required: boolean
  defaultValue?: FieldValue
}

interface StringConstraints {
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
}

interface TextSpec extends Common, StringConstraints {
  kind: 'text'
}

interface RichTextSpec extends Common {
  kind: 'richText'
}

interface NumberSpec extends Common {
  kind: 'number'
  integer: boolean
  minimum?: number
  maximum?: number
}

interface BooleanSpec extends Common {
  kind: 'boolean'
}

interface SelectSpec extends Common {
  kind: 'select'
  options: readonly (string | number)[]
}

export interface GroupSpec extends Common {
  kind: 'group'
  variant?: 'image' | 'link'
  fields: readonly FieldSpec[]
}

export interface ListSpec extends Common {
  kind: 'list'
  item: FieldSpec
  minItems?: number
  maxItems?: number
}

export interface LocalizedSpec extends Common {
  kind: 'localized'
  inner: FieldSpec
}

export type FieldSpec =
  | TextSpec
  | RichTextSpec
  | NumberSpec
  | BooleanSpec
  | SelectSpec
  | GroupSpec
  | ListSpec
  | LocalizedSpec

export class UnsupportedSchemaError extends Error {
  constructor(key: string) {
    super(`The field "${key}" uses a JSON Schema shape the block form cannot render`)
  }
}

function stringConstraints(schema: JsonSchema): StringConstraints {
  const { minLength, maxLength, pattern, format } = schema
  return { minLength, maxLength, pattern, format }
}

function groupFields(schema: JsonSchema): FieldSpec[] {
  const required = new Set(schema.required ?? [])
  return Object.entries(schema.properties ?? {}).map(([key, child]) =>
    parseField(child, key, required.has(key))
  )
}

function parseChild(schema: JsonSchema | undefined, key: string, required: boolean): FieldSpec {
  if (!schema) throw new UnsupportedSchemaError(key)
  return parseField(schema, key, required)
}

function parseStructured(schema: JsonSchema, common: Common): FieldSpec | undefined {
  const { key } = common
  if (schema.backstage === 'localized') {
    return {
      ...common,
      kind: 'localized',
      inner: parseChild(schema.additionalProperties, key, true)
    }
  }
  if (schema.backstage === 'image' || schema.backstage === 'link') {
    return { ...common, kind: 'group', variant: schema.backstage, fields: groupFields(schema) }
  }
  if (schema.type === 'array') {
    return {
      ...common,
      kind: 'list',
      item: parseChild(schema.items, key, true),
      minItems: schema.minItems,
      maxItems: schema.maxItems
    }
  }
  if (schema.type === 'object') return { ...common, kind: 'group', fields: groupFields(schema) }
  return undefined
}

function parseScalar(schema: JsonSchema, common: Common): FieldSpec | undefined {
  if (schema.enum) return { ...common, kind: 'select', options: schema.enum }
  if (schema.type === 'string') return { ...common, kind: 'text', ...stringConstraints(schema) }
  if (schema.type === 'number' || schema.type === 'integer') {
    return {
      ...common,
      kind: 'number',
      integer: schema.type === 'integer',
      minimum: schema.minimum,
      maximum: schema.maximum
    }
  }
  if (schema.type === 'boolean') return { ...common, kind: 'boolean' }
  return undefined
}

function parseField(schema: JsonSchema, key: string, required: boolean): FieldSpec {
  const { title, description } = schema
  const common: Common = { key, title, description, required, defaultValue: schema.default }
  if (schema.backstage === 'richText') return { ...common, kind: 'richText' }
  const spec = parseStructured(schema, common) ?? parseScalar(schema, common)
  if (!spec) throw new UnsupportedSchemaError(key)
  return spec
}

export function parseBlockSchema(schema: JsonSchema): GroupSpec {
  if (schema.type !== 'object') throw new UnsupportedSchemaError('(root)')
  return { key: '', required: true, kind: 'group', fields: groupFields(schema) }
}
