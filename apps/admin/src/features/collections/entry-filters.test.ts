import type { EntrySummary } from '@studiobimo/backstage/internal'
import { describe, expect, it } from 'vitest'

import {
  ENTRY_SORT,
  ENTRY_STATE,
  entryState,
  matchesEntryQuery,
  SORT_DIRECTION,
  visibleEntries
} from './entry-filters'

const entry = (id: string, overrides: Partial<EntrySummary>): EntrySummary => ({
  id,
  collection: 'posts',
  version: 1,
  schemaVersion: 1,
  label: { en: id },
  position: 0,
  slugs: {},
  createdAt: 0,
  updatedAt: 0,
  updatedBy: null,
  publishedAt: null,
  publishedVersion: null,
  publishedBy: null,
  ...overrides
})

const ordering = { language: 'en', fallbackLocale: 'en' }
const idsOf = (entries: EntrySummary[]) => entries.map(({ id }) => id)

const apple = entry('apple', { position: 2, updatedAt: 10, publishedAt: 5, publishedVersion: 1 })
const banana = entry('banana', {
  position: 1,
  label: { en: 'Banana', es: 'Plátano' },
  updatedAt: 30
})
const cherry = entry('cherry', {
  position: 0,
  updatedAt: 20,
  version: 2,
  publishedAt: 5,
  publishedVersion: 1
})
const all = [apple, banana, cherry]

describe('entryState', () => {
  it('tells draft, published and changed apart', () => {
    expect(entryState(banana)).toBe(ENTRY_STATE.draft)
    expect(entryState(apple)).toBe(ENTRY_STATE.published)
    expect(entryState(cherry)).toBe(ENTRY_STATE.changed)
  })
})

describe('matchesEntryQuery', () => {
  it('searches the label in every language, ignoring case and padding', () => {
    expect(matchesEntryQuery(banana, '  plát ')).toBe(true)
    expect(matchesEntryQuery(banana, 'BAN')).toBe(true)
    expect(matchesEntryQuery(banana, 'kiwi')).toBe(false)
    expect(matchesEntryQuery(banana, '   ')).toBe(true)
  })
})

describe('visibleEntries', () => {
  const sorted = (sort: (typeof ENTRY_SORT)[keyof typeof ENTRY_SORT], descending = false) =>
    idsOf(
      visibleEntries(all, '', {
        ...ordering,
        sort,
        direction: descending ? SORT_DIRECTION.descending : SORT_DIRECTION.ascending
      })
    )

  it('sorts by label in either direction', () => {
    expect(sorted(ENTRY_SORT.label)).toEqual(['apple', 'banana', 'cherry'])
    expect(sorted(ENTRY_SORT.label, true)).toEqual(['cherry', 'banana', 'apple'])
  })

  it('sorts by last save', () => {
    expect(sorted(ENTRY_SORT.updated, true)).toEqual(['banana', 'cherry', 'apple'])
    expect(sorted(ENTRY_SORT.updated)).toEqual(['apple', 'cherry', 'banana'])
  })

  it('follows the manual position and ignores the direction', () => {
    expect(sorted(ENTRY_SORT.manual)).toEqual(['cherry', 'banana', 'apple'])
    expect(sorted(ENTRY_SORT.manual, true)).toEqual(['cherry', 'banana', 'apple'])
  })

  it('sorts published entries before changed ones before drafts', () => {
    expect(sorted(ENTRY_SORT.published)).toEqual(['apple', 'cherry', 'banana'])
    expect(sorted(ENTRY_SORT.published, true)).toEqual(['banana', 'cherry', 'apple'])
  })

  it('filters before sorting', () => {
    const result = visibleEntries(all, 'an', {
      ...ordering,
      sort: ENTRY_SORT.label,
      direction: SORT_DIRECTION.ascending
    })
    expect(idsOf(result)).toEqual(['banana'])
  })
})
