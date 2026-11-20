import type { FieldLabels } from '@studiobimo/backstage'
import {
  classifyField,
  type FieldKind,
  type FieldShape,
  isWeeklyHours,
  WEEKDAYS
} from '@studiobimo/backstage/internal'
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
  anyOf?: JsonSchema[]
  backstage?: FieldKind
  labels?: FieldLabels
  collection?: string
  max?: number
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

interface HexColorSpec extends Common {
  kind: 'hexColor'
}

interface MoneySpec extends Common {
  kind: 'money'
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
  acceptsPage?: boolean
  fields: readonly FieldSpec[]
}

export interface WeeklyHoursSpec extends Common {
  kind: 'weeklyHours'
  days: readonly (typeof WEEKDAYS)[number][]
}

export interface ScheduleSpec extends Common {
  kind: 'schedule'
  days: readonly (typeof WEEKDAYS)[number][]
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

export interface ReferenceSpec extends Common {
  kind: 'reference'
  collection: string
  max?: number
}

export type FieldSpec =
  | TextSpec
  | RichTextSpec
  | HexColorSpec
  | MoneySpec
  | NumberSpec
  | BooleanSpec
  | SelectSpec
  | GroupSpec
  | WeeklyHoursSpec
  | ScheduleSpec
  | ListSpec
  | LocalizedSpec
  | ReferenceSpec

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

const acceptsPage = (schema: JsonSchema) =>
  schema.anyOf?.some((branch) => branch.properties?.pageId !== undefined) ?? false

const editableShape = (schema: JsonSchema) =>
  schema.anyOf?.find((branch) => branch.properties?.href) ?? schema

function parseChild(schema: JsonSchema | undefined, key: string, required: boolean): FieldSpec {
  if (!schema) throw new UnsupportedSchemaError(key)
  return parseField(schema, key, required)
}

const NUMBER_SHAPES: readonly FieldShape[] = ['number', 'integer']

const BARE_KINDS = ['richText', 'hexColor', 'money'] as const

const isBareKind = (shape: FieldShape): shape is (typeof BARE_KINDS)[number] =>
  (BARE_KINDS as readonly FieldShape[]).includes(shape)

function parseScalarField(
  shape: FieldShape,
  schema: JsonSchema,
  common: Common
): FieldSpec | undefined {
  if (shape === 'select') return { ...common, kind: 'select', options: schema.enum ?? [] }
  if (shape === 'string') return { ...common, kind: 'text', ...stringConstraints(schema) }
  if (NUMBER_SHAPES.includes(shape)) {
    return {
      ...common,
      kind: 'number',
      integer: shape === 'integer',
      minimum: schema.minimum,
      maximum: schema.maximum
    }
  }
  if (shape === 'boolean') return { ...common, kind: 'boolean' }
  return undefined
}

function parseField(schema: JsonSchema, key: string, required: boolean): FieldSpec {
  const { title, description } = schema
  const common: Common = { key, title, description, required, defaultValue: schema.default }
  const shape = classifyField(schema)
  if (isBareKind(shape)) return { ...common, kind: shape }
  if (shape === 'weeklyHours') return { ...common, kind: 'schedule', days: WEEKDAYS }
  if (shape === 'localized') {
    return {
      ...common,
      kind: 'localized',
      inner: parseChild(schema.additionalProperties, key, true)
    }
  }
  if (shape === 'reference') {
    return { ...common, kind: 'reference', collection: schema.collection ?? '', max: schema.max }
  }
  if (shape === 'image' || shape === 'link') {
    return {
      ...common,
      kind: 'group',
      variant: shape,
      acceptsPage: shape === 'link' && acceptsPage(schema),
      fields: groupFields(editableShape(schema))
    }
  }
  if (shape === 'array') {
    return {
      ...common,
      kind: 'list',
      item: parseChild(schema.items, key, true),
      minItems: schema.minItems,
      maxItems: schema.maxItems
    }
  }
  if (shape === 'object' && isWeeklyHours(schema)) {
    return { ...common, kind: 'weeklyHours', days: WEEKDAYS }
  }
  if (shape === 'object') return { ...common, kind: 'group', fields: groupFields(schema) }
  const scalar = parseScalarField(shape, schema, common)
  if (scalar) return scalar
  throw new UnsupportedSchemaError(key)
}

export function parseBlockSchema(schema: JsonSchema): GroupSpec {
  if (schema.type !== 'object') throw new UnsupportedSchemaError('(root)')
  return { key: '', required: true, kind: 'group', fields: groupFields(schema) }
}
