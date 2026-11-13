import type { RepublishBatch } from '@studiobimo/backstage/internal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { RepublishAllDialog } from './republish-dialog'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/pages/p1">{children}</a>
}))

const STORED_RUN_KEY = 'backstage:republish-run'
const FIRST_BATCH_WAIT_MS = 3000

const status = { remaining: 3, changed: 1, writes: 13, dailyWriteLimit: 1000 }

const batch = (overrides: Partial<RepublishBatch>): RepublishBatch => ({
  since: 100,
  cursor: 'p1',
  republished: [],
  skipped: [],
  remaining: 0,
  writes: 0,
  done: true,
  halted: false,
  ...overrides
})

const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

const mockApi = (batches: RepublishBatch[], current = status) => {
  const posts: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'POST') return reply({ status: current })
      posts.push(JSON.parse(init.body as string))
      return reply(batches[posts.length - 1])
    })
  )
  return posts
}

const open = async () => {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepublishAllDialog pages={[{ ...aboutPage, publishedAt: 1, publishedVersion: 1 }]} />
    </QueryClientProvider>
  )
  await user.click(screen.getByRole('button', { name: /^Republish all|^Resume republishing/ }))
  return user
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('republish all', () => {
  it('shows the pages, the writes and the unpublished changes before it starts', async () => {
    mockApi([])
    await open()
    expect(await screen.findByText(/3 published pages will be republished/)).toBeInTheDocument()
    expect(screen.getByText(/uses 13 writes.*allows 1000 a day/)).toBeInTheDocument()
    expect(screen.getByText(/1 page has unpublished changes/)).toBeInTheDocument()
  })

  it('warns when the run is more than one day of writes', async () => {
    mockApi([], { ...status, writes: 1500 })
    await open()
    expect(await screen.findByText(/more than the 1000 writes of one day/)).toBeInTheDocument()
  })

  it('runs the batches in order and names the pages it skipped', async () => {
    const posts = mockApi([
      batch({ cursor: 'p0', republished: ['p0'], remaining: 1, done: false, writes: 4 }),
      batch({
        skipped: [{ pageId: 'p1', problems: [{ reason: 'unknown_layout', blockId: null }] }],
        writes: 1
      })
    ])
    const user = await open()
    await user.click(await screen.findByRole('button', { name: 'Republish' }))
    expect(
      await screen.findByText(
        /Done. 2 pages were checked, using 5 writes/,
        {},
        { timeout: FIRST_BATCH_WAIT_MS }
      )
    ).toBeInTheDocument()
    expect(posts).toEqual([
      { since: null, cursor: null },
      { since: 100, cursor: 'p0' }
    ])
    expect(screen.getByText('1 page could not be republished and was skipped.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(localStorage.getItem(STORED_RUN_KEY)).toBeNull()
  })

  it('resumes from the stored run after a reload', async () => {
    localStorage.setItem(STORED_RUN_KEY, JSON.stringify({ since: 100, cursor: 'p0' }))
    const posts = mockApi([batch({ republished: ['p1'], writes: 5 })], { ...status, remaining: 1 })
    const user = await open()
    expect(await screen.findByText(/1 page is left from the run you started/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    expect(await screen.findByText(/Done. 1 page was checked/)).toBeInTheDocument()
    expect(posts).toEqual([{ since: 100, cursor: 'p0' }])
  })
})
