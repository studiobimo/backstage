import { richTextPlain } from '@studiobimo/backstage'
import { z } from 'zod'

import type { FieldSpec, GroupSpec } from './spec.ts'

type Scalar = string | number | boolean | null
export interface BlockValue {
  [key: string]: FieldValue | undefined
}
export type FieldValue = Scalar | BlockValue | FieldValue[]

export interface ValueByKind {
  text: string
  richText: BlockValue
  number: number
  boolean: boolean
  select: string | number
  group: BlockValue
  list: FieldValue[]
  localized: BlockValue
}

const fieldValue: z.ZodType<FieldValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(fieldValue), blockValue])
)

export const blockValue: z.ZodType<BlockValue> = z.lazy(() =>
  z.record(z.string(), fieldValue.optional())
)

export function readValue(raw: unknown): FieldValue | undefined {
  const parsed = fieldValue.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

export type Path = readonly PropertyKey[]

export const fieldName = (path: Path): string =>
  path
    .map((segment, index) => {
      if (typeof segment === 'number') return `[${segment}]`
      return index === 0 ? String(segment) : `.${String(segment)}`
    })
    .join('')

export const isRecord = (value: FieldValue | undefined): value is BlockValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isRichText = (value: FieldValue | undefined): value is BlockValue =>
  isRecord(value) && value.type === 'doc'

export function initialValue(spec: FieldSpec): FieldValue | undefined {
  if (spec.defaultValue !== undefined) return spec.defaultValue
  switch (spec.kind) {
    case 'text':
      return spec.required ? '' : undefined
    case 'boolean':
      return spec.required ? false : undefined
    case 'group':
      return spec.required ? initialGroup(spec) : undefined
    case 'list':
      return []
    case 'localized':
      return {}
    default:
      return undefined
  }
}

export function initialGroup(spec: GroupSpec): BlockValue {
  const entries = spec.fields.map((field) => [field.key, initialValue(field)] as const)
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined))
}

export function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined)
  if (typeof value !== 'object' || value === null) return value
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
  return Object.fromEntries(entries.map(([key, entry]) => [key, withoutUndefined(entry)]))
}

export function summarize(value: FieldValue | undefined): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (isRichText(value)) return richTextPlain(value)
  if (isRecord(value)) return Object.values(value).map(summarize).filter(Boolean).join(' · ')
  return ''
}
