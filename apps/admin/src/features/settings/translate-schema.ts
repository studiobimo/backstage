import type { JsonSchema } from '@/features/block-form/spec.ts'

interface FieldCopy {
  title: string
  description?: string
}

export type CopyOf = (path: string) => FieldCopy

const hasFixedFields = (schema: JsonSchema) =>
  schema.backstage === 'image' || schema.backstage === 'link'

const translateProperties = (
  properties: Record<string, JsonSchema>,
  copyOf: CopyOf,
  path: string[]
) =>
  Object.fromEntries(
    Object.entries(properties).map(([key, child]) => {
      const childPath = [...path, key]
      return [key, { ...translateSchema(child, copyOf, childPath), ...copyOf(childPath.join('.')) }]
    })
  )

export function translateSchema(
  schema: JsonSchema,
  copyOf: CopyOf,
  path: string[] = []
): JsonSchema {
  return {
    ...schema,
    ...(schema.properties &&
      !hasFixedFields(schema) && {
        properties: translateProperties(schema.properties, copyOf, path)
      }),
    ...(schema.items && { items: translateSchema(schema.items, copyOf, path) }),
    ...(schema.additionalProperties && {
      additionalProperties: translateSchema(schema.additionalProperties, copyOf, path)
    })
  }
}
