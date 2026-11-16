import { z } from 'zod'

import type { Collection, RoutedCollection } from './collections.ts'
import { isBlank, isRecord, mapMarkedFields, markedFieldsIn } from './translations.ts'
import type { TranslatedNode } from './translations.ts'

export const REFERENCE = {
  mode: { chosen: 'chosen', latest: 'latest' },
  limits: { maxItems: 50, minCount: 1 }
} as const

export type EntryReferenceValue =
  | { mode: typeof REFERENCE.mode.chosen; ids: string[] }
  | { mode: typeof REFERENCE.mode.latest; count: number }

interface EntryAddress {
  slug?: string
  href?: string
}

export type ResolvedEntry<C extends Collection = Collection> = {
  id: string
  content: z.output<C['schema']>
} & (C extends RoutedCollection ? EntryAddress : unknown)

const referenceSchema = (max: number): z.ZodType<EntryReferenceValue> =>
  z.discriminatedUnion('mode', [
    z.object({ mode: z.literal(REFERENCE.mode.chosen), ids: z.array(z.string().min(1)).max(max) }),
    z.object({
      mode: z.literal(REFERENCE.mode.latest),
      count: z.int().min(REFERENCE.limits.minCount).max(max)
    })
  ])

const storedReferenceSchema = referenceSchema(Number.MAX_SAFE_INTEGER)

export const entries = <C extends Collection>(
  collection: C,
  { max = REFERENCE.limits.maxItems }: { max?: number } = {}
) =>
  referenceSchema(max).meta({
    backstage: 'reference',
    collection: collection.name,
    max
  }) as unknown as z.ZodType<ResolvedEntry<C>[], EntryReferenceValue>

export interface ReferenceField {
  blockId: string
  path: string
  collection: string
  value: EntryReferenceValue
}

export const referenceFieldsIn = (
  node: TranslatedNode,
  blockId: string,
  content: unknown
): ReferenceField[] =>
  markedFieldsIn(node, content, 'reference').flatMap(({ path, value, node: field }) => {
    const parsed = storedReferenceSchema.safeParse(value)
    return parsed.success && field.collection
      ? [{ blockId, path, collection: field.collection, value: parsed.data }]
      : []
  })

export interface PublishedEntry {
  id: string
  schemaVersion: number
  content: unknown
  slugs?: Readonly<Record<string, string>>
}

interface PublishedPool {
  byId: ReadonlyMap<string, PublishedEntry>
  latest: readonly PublishedEntry[]
}

export type PublishedEntries = ReadonlyMap<string, PublishedPool>

export interface ReferenceNeeds {
  ids: string[]
  latest: number
}

export const referenceNeedsOf = (fields: readonly ReferenceField[]) => {
  const needs = new Map<string, ReferenceNeeds>()
  for (const { collection, value } of fields) {
    const current = needs.get(collection) ?? { ids: [], latest: 0 }
    needs.set(collection, {
      ids: value.mode === REFERENCE.mode.chosen ? [...current.ids, ...value.ids] : current.ids,
      latest:
        value.mode === REFERENCE.mode.latest
          ? Math.max(current.latest, value.count)
          : current.latest
    })
  }
  return needs
}

export interface PageEntryRef {
  collection: string
  entryId: string | null
}

export const entryRefsOf = (fields: readonly ReferenceField[]): PageEntryRef[] => {
  const refs = new Map<string, PageEntryRef>()
  for (const { collection, value } of fields) {
    const ids = value.mode === REFERENCE.mode.chosen ? value.ids : [null]
    for (const entryId of ids)
      refs.set(JSON.stringify([collection, entryId]), { collection, entryId })
  }
  return [...refs.values()]
}

export interface ResolvedReferences {
  entries: Record<string, Record<string, PublishedEntry>>
  references: Record<string, Record<string, string[]>>
}

export const NO_REFERENCES = { entries: {}, references: {} }

const idsOf = ({ collection, value }: ReferenceField, pool: PublishedEntries) => {
  const published = pool.get(collection)
  if (!published) return []
  if (value.mode === REFERENCE.mode.latest) {
    return published.latest.slice(0, value.count).map(({ id }) => id)
  }
  return [...new Set(value.ids)].filter((id) => published.byId.has(id))
}

export const resolveReferences = (
  fields: readonly ReferenceField[],
  pool: PublishedEntries
): ResolvedReferences => {
  const resolved: ResolvedReferences = { entries: {}, references: {} }
  for (const field of fields) {
    const ids = idsOf(field, pool)
    const byPath = (resolved.references[field.blockId] ??= {})
    byPath[field.path] = ids
    const byId = (resolved.entries[field.collection] ??= {})
    for (const id of ids) {
      const entry = pool.get(field.collection)?.byId.get(id)
      if (entry) byId[id] = entry
    }
  }
  return resolved
}

export const localizeEntryContent = (
  node: TranslatedNode,
  content: unknown,
  locale: string,
  defaultLocale: string
) =>
  mapMarkedFields(node, content, 'localized', ({ value }) => {
    if (!isRecord(value)) return {}
    const own = value[locale]
    const chosen = isBlank(own) ? value[defaultLocale] : own
    return chosen === undefined ? {} : { [locale]: chosen }
  })
