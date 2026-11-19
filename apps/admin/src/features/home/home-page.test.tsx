import type { PageSummary } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearDraft, writeDraft } from '@/features/page-editor/unsaved-pages'
import { aboutPage } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'

import { HomePage } from './home-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: ReactNode
    to: string
    params?: { pageId: string }
  }) => (
    <a href={params ? to.replace('$pageId', params.pageId) : to} {...props}>
      {children}
    </a>
  )
}))

const renderHome = async (pages: PageSummary[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ pages })))
  )
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense fallback={null}>
        <HomePage />
      </Suspense>
    </QueryClientProvider>
  )
  await screen.findByRole('heading', { level: 1 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearDraft(aboutPage.id)
})

describe('HomePage', () => {
  it('lists recent pages with their status and a link to each editor', async () => {
    const changed = {
      ...aboutPage,
      id: 'p2',
      updatedAt: 5,
      publishedAt: 1,
      publishedVersion: 0,
      locales: [{ locale: 'en', slug: 'news', title: 'News' }]
    }
    await renderHome([aboutPage, changed])
    expect(await screen.findByRole('heading', { name: 'Where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit blocks: News' })).toHaveAttribute(
      'href',
      '/pages/p2'
    )
    expect(screen.getByRole('link', { name: 'Edit blocks: About' })).toHaveAttribute(
      'href',
      '/pages/p1'
    )
    expect(screen.getByText('Unpublished changes')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows the first-run state that points to New page on a fresh install', async () => {
    await renderHome([])
    expect(await screen.findByText('Start with your first page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New page' })).toHaveAttribute('href', '/pages')
    expect(screen.queryByRole('heading', { name: 'Where you left off' })).not.toBeInTheDocument()
  })

  it('marks a page Unsaved while it has a stored draft and drops the mark once cleared', async () => {
    await renderHome([aboutPage])
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument()
    act(() => writeDraft(aboutPage.id, { blocks: [], layout: 'default', seo: {} }))
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    act(() => clearDraft(aboutPage.id))
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument()
  })
})
