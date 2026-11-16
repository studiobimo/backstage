import type { EntrySummary } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { type ReactNode, Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { helloEntry, postsCollection } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'

import { EntriesPage } from './entries-page'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="/collections/posts/e1" className={className}>
      {children}
    </a>
  ),
  useNavigate: () => navigate
}))

const zebra: EntrySummary = {
  ...helloEntry,
  id: 'e2',
  label: { en: 'Zebra crossing' },
  updatedAt: 3000,
  publishedAt: 4000,
  publishedVersion: 1
}
const apple: EntrySummary = { ...helloEntry, id: 'e3', label: { en: 'Apple pie' }, updatedAt: 2000 }

const mockApi = (entries: EntrySummary[]) => {
  const calls: { method: string; url: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ method, url })
      if (method === 'DELETE') {
        return new Response(
          JSON.stringify({ republish: { pages: 0, writes: 0, pending: false, batch: null } })
        )
      }
      if (url.endsWith('/entries')) return new Response(JSON.stringify({ entries }))
      return new Response(JSON.stringify({ collections: [postsCollection] }))
    })
  )
  return calls
}

const renderPage = (name = 'posts') =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense>
        <EntriesPage name={name} />
      </Suspense>
    </QueryClientProvider>
  )

const titles = async () => {
  const table = await screen.findByRole('table')
  return within(table)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

const chooseSort = async (user: ReturnType<typeof userEvent.setup>, option: string) => {
  await user.click(await screen.findByRole('combobox', { name: 'Sort entries' }))
  await user.click(await screen.findByRole('option', { name: option }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  navigate.mockClear()
})

describe('EntriesPage', { timeout: 15_000 }, () => {
  it('titles the page from the collection and lists newest saves first', async () => {
    mockApi([helloEntry, zebra, apple])
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Posts' })).toBeInTheDocument()
    expect(await titles()).toEqual(['Zebra crossing', 'Apple pie', 'Hello world'])
  })

  it('searches the label in every language', async () => {
    mockApi([helloEntry, zebra, apple])
    const user = userEvent.setup()
    renderPage()
    await user.type(await screen.findByRole('searchbox', { name: 'Search entries' }), 'hola')
    expect(await titles()).toEqual(['Hello world'])
    await user.clear(screen.getByRole('searchbox', { name: 'Search entries' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search entries' }), 'nothing')
    expect(await screen.findByText('No entries match')).toBeInTheDocument()
  })

  it('sorts by title and flips the direction', async () => {
    mockApi([helloEntry, zebra, apple])
    const user = userEvent.setup()
    renderPage()
    await chooseSort(user, 'Title')
    expect(await titles()).toEqual(['Apple pie', 'Hello world', 'Zebra crossing'])
    await user.click(screen.getByRole('button', { name: /Ascending/ }))
    expect(await titles()).toEqual(['Zebra crossing', 'Hello world', 'Apple pie'])
  })

  it('sorts published entries first', async () => {
    mockApi([helloEntry, zebra, apple])
    const user = userEvent.setup()
    renderPage()
    await chooseSort(user, 'Published state')
    expect((await titles())[0]).toBe('Zebra crossing')
  })

  it('shows an empty state with a way to create the first entry', async () => {
    mockApi([])
    renderPage()
    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /New entry/ })).toBeInTheDocument()
  })

  it('says so when the collection is not defined', async () => {
    mockApi([])
    renderPage('unknown')
    expect(await screen.findByText('Collection not found')).toBeInTheDocument()
  })

  it('deletes an entry only after the dialog is confirmed', async () => {
    const calls = mockApi([helloEntry])
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Actions for Hello world' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(calls.some(({ method }) => method === 'DELETE')).toBe(false)
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        url: '/api/v1/collections/posts/entries/e1'
      })
    )
  })
})
