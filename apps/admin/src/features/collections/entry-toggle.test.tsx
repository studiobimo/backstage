import type { EntrySummary } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { helloEntry, postsCollection } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'

import { EntriesPage } from './entries-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/collections/posts/e1">{children}</a>,
  useNavigate: () => vi.fn()
}))

const dish: EntrySummary = {
  ...helloEntry,
  label: { en: 'Tacos' },
  publishedAt: 1000,
  publishedVersion: 1,
  toggles: { soldOut: false }
}

const mockApi = () => {
  const toggles: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        toggles.push(JSON.parse(String(init.body)))
        return new Response(
          JSON.stringify({
            entry: { ...dish, version: 2, toggles: { soldOut: true }, content: {} },
            republish: { pages: 0, writes: 0, pending: false, batch: null },
            writes: 0
          })
        )
      }
      if (url.includes('/republish')) {
        return new Response(
          JSON.stringify({ status: { remaining: 2, changed: 2, writes: 4, dailyWriteLimit: 1000 } })
        )
      }
      if (url.endsWith('/entries')) return new Response(JSON.stringify({ entries: [dish] }))
      const collection = { ...postsCollection, quickToggle: ['soldOut'] }
      return new Response(JSON.stringify({ collections: [collection] }))
    })
  )
  return toggles
}

const renderPage = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense>
        <EntriesPage name="posts" />
      </Suspense>
    </QueryClientProvider>
  )

beforeEach(() => localStorage.clear())

afterEach(() => vi.unstubAllGlobals())

describe('quick toggle in the entries list', { timeout: 15_000 }, () => {
  it('asks about the cost on first use, then publishes the one change', async () => {
    const sent = mockApi()
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('switch', { name: 'Sold out: Tacos' }))
    expect(await screen.findByText(/2 published pages show this entry/)).toBeInTheDocument()
    expect(sent).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Publish with switches' }))
    await vi.waitFor(() =>
      expect(sent).toEqual([{ field: 'soldOut', value: true, expectedVersion: 1 }])
    )
  })

  it('does not ask again once the cost was accepted', async () => {
    const sent = mockApi()
    localStorage.setItem('backstage:entry-toggle-acknowledged', 'true')
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('switch', { name: 'Sold out: Tacos' }))
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
