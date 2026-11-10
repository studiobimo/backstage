import type { PageSummary } from '@studiobimo/backstage'

export const PAGE_STATUS = { all: 'all', draft: 'draft', published: 'published' } as const

export type PageStatusFilter = (typeof PAGE_STATUS)[keyof typeof PAGE_STATUS]

export const PAGE_STATUS_FILTERS = Object.values(PAGE_STATUS)

export const isPublished = (page: PageSummary) => page.publishedAt !== null

const matchesStatus = (page: PageSummary, status: PageStatusFilter) =>
  status === PAGE_STATUS.all || isPublished(page) === (status === PAGE_STATUS.published)

const matchesQuery = (page: PageSummary, query: string) => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return page.locales.some((row) =>
    [row.title, row.slug ?? ''].some((text) => text.toLowerCase().includes(needle))
  )
}

export const filterPages = (pages: PageSummary[], status: PageStatusFilter, query: string) =>
  pages.filter((page) => matchesStatus(page, status) && matchesQuery(page, query))

export const countByStatus = (pages: PageSummary[]): Record<PageStatusFilter, number> => ({
  all: pages.length,
  draft: filterPages(pages, PAGE_STATUS.draft, '').length,
  published: filterPages(pages, PAGE_STATUS.published, '').length
})
