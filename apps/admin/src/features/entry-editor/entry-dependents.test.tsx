import type { Entry, EntryDependents, RepublishBatch } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toastManager } from '@/components/ui/toast'
import { testQueryClient } from '@/test/query-client'
import { helloEntry, postsCollection } from '@/test/fixtures'

import { EntryEditor } from './entry-editor'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', async () => ({
  ...(await import('@/test/blocker')).blockerRouterMock,
  Link: () => null,
  useNavigate: () => navigate
}))

const published: Entry = {
  ...helloEntry,
  publishedAt: 5000,
  publishedVersion: 1,
  content: { title: { en: 'Hello world' } }
}

const status = { remaining: 2, changed: 0, writes: 4, dailyWriteLimit: 1000 }
const refreshed = (pages: number): EntryDependents => ({
  pages,
  writes: pages * 2,
  pending: false,
  batch: null
})
const pendingRun: EntryDependents = { pages: 2, writes: 4, pending: true, batch: null }
const entryScope = { collection: 'posts', entryId: 'e1' }

const batch = (overrides: Partial<RepublishBatch>): RepublishBatch => ({
  since: 100,
  cursor: 'p1',
  republished: ['p1'],
  skipped: [],
  remaining: 0,
  writes: 2,
  done: true,
  halted: false,
  ...overrides
})

interface Api {
  status?: typeof status
  republish?: EntryDependents
  batches?: RepublishBatch[]
}

const reply = (body: unknown) => new Response(JSON.stringify(body))

const mockApi = ({ status: counted, republish = refreshed(0), batches = [] }: Api = {}) => {
  const requests: { method: string; url: string; body?: unknown }[] = []
  let batchesSent = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      requests.push({ method, url, body })
      if (url.includes('/republish')) {
        if (method === 'POST') return reply(batches[batchesSent++])
        return reply({ status: counted ?? { ...status, remaining: 0, writes: 0 } })
      }
      if (url.endsWith('/pages')) return reply({ pages: [] })
      if (url.endsWith('/e1/publish') || method === 'DELETE') {
        return reply(method === 'DELETE' ? { republish } : { entry: published, republish })
      }
      if (url.endsWith('/e1')) return reply({ entry: published })
      return reply({ collections: [postsCollection] })
    })
  )
  return requests
}

const renderEditor = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense>
        <EntryEditor name="posts" entryId="e1" />
      </Suspense>
    </QueryClientProvider>
  )

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  navigate.mockReset()
})

describe('entry dependents before the action', { timeout: 15_000 }, () => {
  it('says how many pages will update and what it costs before publishing', async () => {
    const requests = mockApi({ status })
    renderEditor()
    expect(
      await screen.findByText(
        /2 published pages show this entry and will update, using 4 KV writes/
      )
    ).toBeInTheDocument()
    expect(requests).toContainEqual({
      method: 'GET',
      url: '/api/v1/republish?collection=posts&entryId=e1',
      body: undefined
    })
  })

  it('adds nothing when no page shows the entry', async () => {
    mockApi()
    renderEditor()
    await screen.findByRole('button', { name: /Publish/ })
    await waitFor(() => expect(screen.queryByText(/KV writes/)).not.toBeInTheDocument())
  })

  it('repeats it in the delete dialog', async () => {
    mockApi({ status })
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/2 published pages show/)
  })
})

describe('entry dependents after the action', { timeout: 15_000 }, () => {
  it('toasts how many pages were updated when they fit one request', async () => {
    const toast = vi.spyOn(toastManager, 'add')
    mockApi({ status, republish: refreshed(2) })
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('button', { name: /Publish/ }))
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: '2 pages updated' }))
    )
  })

  it('drives the batches with the entry scope when the request left them pending', async () => {
    const requests = mockApi({
      status,
      republish: pendingRun,
      batches: [batch({ remaining: 1, done: false }), batch({ cursor: 'p2' })]
    })
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('button', { name: /Publish/ }))
    expect(
      await screen.findByText(/Done. 2 pages were checked/, {}, { timeout: 5000 })
    ).toBeInTheDocument()
    expect(
      requests.filter(({ method, url }) => method === 'POST' && url.endsWith('/republish'))
    ).toEqual([
      {
        method: 'POST',
        url: '/api/v1/republish',
        body: { since: null, cursor: null, entry: entryScope }
      },
      {
        method: 'POST',
        url: '/api/v1/republish',
        body: { since: null, cursor: 'p1', entry: entryScope }
      }
    ])
  })

  it('leaves a deleted entry only after its pages are updated', async () => {
    mockApi({ status, republish: pendingRun, batches: [batch({ remaining: 0 })] })
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete entry' }))
    expect(await screen.findByText(/Done. 1 page was checked/)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
