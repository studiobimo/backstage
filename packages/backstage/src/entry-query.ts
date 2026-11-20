import { z } from 'zod'

import { COLLECTION_KEY } from './collection-key.ts'
import type { PublishedEntry } from './references.ts'
import { isRecord } from './translations.ts'

export const ENTRY_QUERY = {
  positionKey: '$position',
  direction: { ascending: 'asc', descending: 'desc' }
} as const

const scalarSchema = z.union([z.string(), z.number(), z.boolean()])

export const entryQueryShape = (max: number) => ({
  where: z.record(z.string().min(1), scalarSchema).optional(),
  orderBy: z
    .object({
      field: z.string().min(1),
      direction: z.enum([ENTRY_QUERY.direction.ascending, ENTRY_QUERY.direction.descending])
    })
    .optional(),
  groupBy: z.string().min(1).optional(),
  limit: z.int().min(1).max(max)
})

export type EntryQuery = z.infer<z.ZodObject<ReturnType<typeof entryQueryShape>>>

export interface EntryGroupIds {
  group: string
  ids: string[]
}

export interface QueryPool {
  entries: readonly PublishedEntry[]
  groupOrders: Readonly<Record<string, readonly string[]>>
  keyField?: string
}

export interface QuerySelection {
  ids: string[]
  groups: EntryGroupIds[] | null
}

type Queryable = Pick<PublishedEntry, 'content'>

interface QueryScope {
  keyField?: string
}

const valueOf = (entry: Queryable, field: string, { keyField }: QueryScope) => {
  const name = field === COLLECTION_KEY.queryField && keyField ? keyField : field
  return isRecord(entry.content) ? entry.content[name] : undefined
}

const matchesWhere = (entry: Queryable, where: EntryQuery['where'], scope: QueryScope) =>
  Object.entries(where ?? {}).every(([field, wanted]) => valueOf(entry, field, scope) === wanted)

const compareValues = (left: unknown, right: unknown, sign: number) => {
  if (left === right) return 0
  if (left === undefined) return 1
  if (right === undefined) return -1
  return sign * ((left as string | number) < (right as string | number) ? -1 : 1)
}

const sortedBy = <E extends Queryable>(
  entries: E[],
  orderBy: EntryQuery['orderBy'],
  scope: QueryScope
) => {
  if (!orderBy) return entries
  const descending = orderBy.direction === ENTRY_QUERY.direction.descending
  if (orderBy.field === ENTRY_QUERY.positionKey) return descending ? entries.reverse() : entries
  return entries.sort((left, right) =>
    compareValues(
      valueOf(left, orderBy.field, scope),
      valueOf(right, orderBy.field, scope),
      descending ? -1 : 1
    )
  )
}

const groupedIds = (
  entries: readonly PublishedEntry[],
  field: string,
  order: readonly string[],
  scope: QueryScope
): EntryGroupIds[] =>
  order.flatMap((group) => {
    const ids = entries
      .filter((entry) => valueOf(entry, field, scope) === group)
      .map(({ id }) => id)
    return ids.length > 0 ? [{ group, ids }] : []
  })

export const selectEntries = <E extends Queryable>(
  entries: readonly E[],
  { where, orderBy, limit }: Pick<EntryQuery, 'where' | 'orderBy'> & { limit?: number },
  scope: QueryScope = {}
): E[] =>
  sortedBy(
    entries.filter((entry) => matchesWhere(entry, where, scope)),
    orderBy,
    scope
  ).slice(0, limit)

export const selectQuery = (pool: QueryPool, query: EntryQuery): QuerySelection => {
  const scope = { keyField: pool.keyField }
  const selected = selectEntries(pool.entries, query, scope)
  const groups = query.groupBy
    ? groupedIds(selected, query.groupBy, pool.groupOrders[query.groupBy] ?? [], scope)
    : null
  return { ids: groups?.flatMap(({ ids }) => ids) ?? selected.map(({ id }) => id), groups }
}
