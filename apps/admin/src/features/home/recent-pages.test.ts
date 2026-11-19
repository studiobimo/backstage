import { describe, expect, it } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { HOME, recentPages } from './recent-pages'

const editedAt = (id: string, updatedAt: number) => ({ ...aboutPage, id, updatedAt })

describe('recentPages', () => {
  it('lists the most recently edited page first', () => {
    const pages = [editedAt('old', 1), editedAt('new', 3), editedAt('mid', 2)]
    expect(recentPages(pages).map(({ id }) => id)).toEqual(['new', 'mid', 'old'])
  })

  it('keeps only the limit and leaves the input untouched', () => {
    const pages = Array.from({ length: HOME.recentPages.limit + 2 }, (_, index) =>
      editedAt(`p${index}`, index)
    )
    expect(recentPages(pages)).toHaveLength(HOME.recentPages.limit)
    expect(pages[0].id).toBe('p0')
  })
})
