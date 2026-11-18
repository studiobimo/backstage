import type { PageSummary } from '@studiobimo/backstage/internal'

export const HOME = { recentPages: { limit: 5 } } as const

export const recentPages = (pages: PageSummary[]) =>
  [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, HOME.recentPages.limit)
