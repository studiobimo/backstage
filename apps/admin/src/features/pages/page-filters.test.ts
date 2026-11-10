import { describe, expect, it } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { countByStatus, filterPages, PAGE_STATUS } from './page-filters'

const published = { ...aboutPage, id: 'p2', publishedAt: 1 }
const home = {
  ...aboutPage,
  id: 'p3',
  isHome: true,
  locales: [
    { locale: 'en', slug: null, title: 'Welcome' },
    { locale: 'es', slug: null, title: 'Bienvenida' }
  ]
}
const pages = [aboutPage, published, home]

describe('filterPages', () => {
  it('keeps every page for the all filter and an empty search', () => {
    expect(filterPages(pages, PAGE_STATUS.all, '')).toHaveLength(3)
  })

  it('splits drafts from published pages', () => {
    expect(filterPages(pages, PAGE_STATUS.draft, '').map((page) => page.id)).toEqual(['p1', 'p3'])
    expect(filterPages(pages, PAGE_STATUS.published, '').map((page) => page.id)).toEqual(['p2'])
  })

  it('searches the title and address in every language, ignoring case', () => {
    expect(filterPages(pages, PAGE_STATUS.all, ' ACERCA ').map((page) => page.id)).toEqual([
      'p1',
      'p2'
    ])
    expect(filterPages(pages, PAGE_STATUS.all, 'bienvenida').map((page) => page.id)).toEqual(['p3'])
  })

  it('combines the status and the search', () => {
    expect(filterPages(pages, PAGE_STATUS.published, 'about').map((page) => page.id)).toEqual([
      'p2'
    ])
    expect(filterPages(pages, PAGE_STATUS.published, 'welcome')).toEqual([])
  })
})

describe('countByStatus', () => {
  it('counts each status', () => {
    expect(countByStatus(pages)).toEqual({ all: 3, draft: 2, published: 1 })
  })
})
