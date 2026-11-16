import { hasUnpublishedChanges, type EntrySummary } from '@studiobimo/backstage/internal'

import { entryLabelText } from './collection-text'

export const ENTRY_SORT = { label: 'label', updated: 'updated', published: 'published' } as const

export type EntrySort = (typeof ENTRY_SORT)[keyof typeof ENTRY_SORT]

export const ENTRY_SORTS = Object.values(ENTRY_SORT)

export const SORT_DIRECTION = { ascending: 'ascending', descending: 'descending' } as const

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION]

export const DEFAULT_ENTRY_SORT = {
  sort: ENTRY_SORT.updated,
  direction: SORT_DIRECTION.descending
} as const

export const defaultDirection = (sort: EntrySort): SortDirection =>
  sort === ENTRY_SORT.updated ? SORT_DIRECTION.descending : SORT_DIRECTION.ascending

export const ENTRY_STATE = { published: 'published', changed: 'changed', draft: 'draft' } as const

export type EntryState = (typeof ENTRY_STATE)[keyof typeof ENTRY_STATE]

export const entryState = (entry: EntrySummary): EntryState => {
  if (entry.publishedAt === null) return ENTRY_STATE.draft
  return hasUnpublishedChanges(entry) ? ENTRY_STATE.changed : ENTRY_STATE.published
}

const STATE_RANK: Record<EntryState, number> = {
  [ENTRY_STATE.published]: 0,
  [ENTRY_STATE.changed]: 1,
  [ENTRY_STATE.draft]: 2
}

export const matchesEntryQuery = (entry: EntrySummary, query: string) => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return Object.values(entry.label).some((text) => text.toLowerCase().includes(needle))
}

interface Ordering {
  sort: EntrySort
  direction: SortDirection
  language: string
  fallbackLocale: string
}

const byUpdatedNewestFirst = (a: EntrySummary, b: EntrySummary) => b.updatedAt - a.updatedAt

const compareBy = (sort: EntrySort, language: string, fallbackLocale: string) => {
  const labelOf = (entry: EntrySummary) => entryLabelText(entry.label, language, fallbackLocale)
  switch (sort) {
    case ENTRY_SORT.label:
      return (a: EntrySummary, b: EntrySummary) =>
        labelOf(a).localeCompare(labelOf(b), language, { sensitivity: 'base' })
    case ENTRY_SORT.published:
      return (a: EntrySummary, b: EntrySummary) =>
        STATE_RANK[entryState(a)] - STATE_RANK[entryState(b)]
    case ENTRY_SORT.updated:
      return (a: EntrySummary, b: EntrySummary) => a.updatedAt - b.updatedAt
  }
}

const sortEntries = (
  entries: EntrySummary[],
  { sort, direction, language, fallbackLocale }: Ordering
) => {
  const sign = direction === SORT_DIRECTION.ascending ? 1 : -1
  const compare = compareBy(sort, language, fallbackLocale)
  return [...entries].sort((a, b) => sign * compare(a, b) || byUpdatedNewestFirst(a, b))
}

export const visibleEntries = (entries: EntrySummary[], query: string, ordering: Ordering) =>
  sortEntries(
    entries.filter((entry) => matchesEntryQuery(entry, query)),
    ordering
  )
