import { z } from 'zod'

import type { FieldSpec, GroupSpec } from './spec.ts'

type Scalar = string | number | boolean | null
export interface BlockValue {
  [key: string]: FieldValue | undefined
}
export type FieldValue = Scalar | BlockValue | FieldValue[]

export interface ValueByKind {
  text: string
  number: number
  boolean: boolean
  select: string | number
  group: BlockValue
}

const fieldValue: z.ZodType<FieldValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(fieldValue), blockValue])
)

export const blockValue: z.ZodType<BlockValue> = z.lazy(() =>
  z.record(z.string(), fieldValue.optional())
)

export type Path = readonly PropertyKey[]

export const fieldName = (path: Path): string =>
  path
    .map((segment, index) => {
      if (typeof segment === 'number') return `[${segment}]`
      return index === 0 ? String(segment) : `.${String(segment)}`
    })
    .join('')

function initialValue(spec: FieldSpec): FieldValue | undefined {
  if (spec.defaultValue !== undefined) return spec.defaultValue
  switch (spec.kind) {
    case 'text':
      return spec.required ? '' : undefined
    case 'boolean':
      return spec.required ? false : undefined
    case 'group':
      return spec.required ? initialGroup(spec) : undefined
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
