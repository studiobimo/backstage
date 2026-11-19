import { z } from 'zod'

import {
  assertRenderable,
  NAME_PATTERN,
  schemaNodeOf,
  type CollectionRegistry,
  type FormRegistry,
  type SettingsRegistry,
  type Registry
} from './blocks.ts'
import { assertEntryRoute, type CollectionRoute } from './entry-pages.ts'
import type { SchemaNode } from './field-shapes.ts'
import { isRecord } from './translations.ts'

type LabelKey<S extends z.ZodType> = z.ZodType extends S
  ? string
  : Extract<keyof z.input<S>, string>

export interface CollectionDefinition<
  S extends z.ZodType = z.ZodType,
  N extends string = string,
  R extends CollectionRoute | undefined = CollectionRoute | undefined
> {
  name: N
  route?: R
  label: LabelKey<S>
  version?: number
  schema: S
  migrate?: (content: unknown, fromVersion: number) => unknown
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

export interface Collection<
  S extends z.ZodType = z.ZodType,
  N extends string = string
> extends Omit<CollectionDefinition<S, N>, 'label'> {
  label: string
  version: number
}

export type RoutedCollection<
  S extends z.ZodType = z.ZodType,
  N extends string = string
> = Collection<S, N> & { route: CollectionRoute }

type DefinedCollection<
  S extends z.ZodType,
  N extends string,
  R extends CollectionRoute | undefined
> = R extends CollectionRoute ? RoutedCollection<S, N> : Collection<S, N>

export function defineCollection<
  S extends z.ZodType,
  const N extends string,
  const R extends CollectionRoute | undefined = undefined
>(definition: CollectionDefinition<S, N, R>): DefinedCollection<S, N, R> {
  if (!NAME_PATTERN.test(definition.name)) {
    throw new Error(
      `Collection name "${definition.name}" must be lowercase letters, digits and hyphens`
    )
  }
  if (definition.route) assertEntryRoute(definition.name, definition.route)
  return { ...definition, version: definition.version ?? 1 } as DefinedCollection<S, N, R>
}

type MaybeNode = SchemaNode | boolean | undefined

const isTextNode = (node: MaybeNode) => typeof node === 'object' && node.type === 'string'

const isTextLabel = (node: MaybeNode) =>
  typeof node === 'object' &&
  (isTextNode(node) || (node.backstage === 'localized' && isTextNode(node.additionalProperties)))

export function assertCollection(collection: Collection) {
  const schema = assertRenderable(collection, 'Collection')
  if (!isTextLabel(schema.properties?.[collection.label])) {
    throw new Error(
      `Collection "${collection.name}" label "${collection.label}" must name a text or localized text field`
    )
  }
}

export type EntryLabels = Record<string, string>

const nonBlank = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

export function entryLabelsOf(
  collection: Collection,
  content: unknown,
  defaultLocale: string
): EntryLabels {
  const value = isRecord(content) ? content[collection.label] : undefined
  if (nonBlank(value)) return { [defaultLocale]: value.trim() }
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([locale, text]) =>
      nonBlank(text) ? [[locale, text.trim()]] : []
    )
  )
}

export interface CollectionDescription {
  name: string
  version: number
  label: string
  route?: CollectionRoute
  schema: Readonly<Record<string, unknown>>
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

export type AdminRegistry = Registry &
  Partial<CollectionRegistry> &
  Partial<SettingsRegistry> &
  Partial<FormRegistry>

export const collectionsOf = ({ collections }: Partial<CollectionRegistry>) =>
  collections ?? new Map<string, Collection>()

export const describeCollections = (
  registry: Partial<CollectionRegistry>
): CollectionDescription[] =>
  [...collectionsOf(registry).values()].map(
    ({ name, version, label, route, schema, title, description }) => ({
      name,
      version,
      label,
      route,
      schema: schemaNodeOf(schema),
      title,
      description
    })
  )
