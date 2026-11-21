import type { Entry } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { blocker } from '@/test/blocker'
import { helloEntry, postsCollection } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'

import { EntryEditor } from './entry-editor'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', async () => ({
  ...(await import('@/test/blocker')).blockerRouterMock,
  Link: ({ children }: { children: ReactNode }) => <a href="/collections/posts">{children}</a>,
  useNavigate: () => navigate
}))

const NO_DEPENDENTS = { pages: 0, writes: 0, pending: false, batch: null }

const stored: Entry = { ...helloEntry, content: { title: { en: 'Hello world', es: 'Hola mundo' } } }

interface Reply {
  status: number
  body?: unknown
}

const json = ({ status, body }: Reply) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const mockApi = (
  replies: { write?: Reply; publish?: Reply; collections?: unknown[]; entry?: Entry } = {}
) => {
  const writes: { method: string; url: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method !== 'GET') {
        writes.push({ method, url, body: JSON.parse((init?.body as string) ?? '{}') })
      }
      if (url.endsWith('/publish')) {
        return json(
          replies.publish ?? { status: 200, body: { entry: stored, republish: NO_DEPENDENTS } }
        )
      }
      if (method === 'POST' || method === 'PUT') {
        const content = JSON.parse(init?.body as string).content
        const saved = { ...stored, id: 'e9', version: stored.version + 1, content }
        return json(
          replies.write ?? { status: method === 'POST' ? 201 : 200, body: { entry: saved } }
        )
      }
      if (url.endsWith('/e1'))
        return json({ status: 200, body: { entry: replies.entry ?? stored } })
      return json({ status: 200, body: { collections: replies.collections ?? [postsCollection] } })
    })
  )
  return writes
}

const routed = { ...postsCollection, route: { path: '/blog/:slug' } }

const renderEditor = (entryId?: string) =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense>
        <EntryEditor name="posts" entryId={entryId} />
      </Suspense>
    </QueryClientProvider>
  )

const typeTitle = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  const field = await screen.findByLabelText('Title')
  await user.clear(field)
  await user.type(field, text)
}

afterEach(() => {
  vi.unstubAllGlobals()
  blocker.state = { status: 'idle' }
  navigate.mockReset()
})

describe('EntryEditor', { timeout: 15_000 }, () => {
  it('creates an entry in the first language and opens it without asking to discard', async () => {
    const writes = mockApi()
    const blockedWhenLeaving: boolean[] = []
    navigate.mockImplementation(() => {
      blockedWhenLeaving.push(blocker.options?.shouldBlockFn() ?? true)
    })
    const user = userEvent.setup()
    renderEditor()
    expect(await screen.findByRole('heading', { level: 1, name: 'New entry' })).toBeInTheDocument()
    await typeTitle(user, 'Brand new')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(writes).toContainEqual({
        method: 'POST',
        url: '/api/v1/collections/posts/entries',
        body: { content: { title: { en: 'Brand new' } } }
      })
    )
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ params: { name: 'posts', entryId: 'e9' }, replace: true })
      )
    )
    expect(blockedWhenLeaving).toEqual([false])
  })

  it('keeps the draft and says what is wrong when the server refuses it', async () => {
    mockApi({
      write: {
        status: 422,
        body: {
          error: 'Invalid',
          code: 'invalid',
          issues: [{ path: ['title', 'en'], code: 'too_small', origin: 'string', minimum: 1 }]
        }
      }
    })
    const user = userEvent.setup()
    renderEditor()
    await typeTitle(user, 'x')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByLabelText('Title')).toHaveValue('x')
    expect(navigate).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInvalid())
  })

  it('saves edits against the version it loaded', async () => {
    const writes = mockApi()
    const user = userEvent.setup()
    renderEditor('e1')
    await typeTitle(user, 'Hello again')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(writes[0]?.method).toBe('PUT'))
    expect(writes[0]?.body).toEqual({
      content: { title: { en: 'Hello again', es: 'Hola mundo' } },
      expectedVersion: 1
    })
  })
})

describe('EntryEditor drafts', { timeout: 15_000 }, () => {
  it('blocks leaving only while there are unsaved edits', async () => {
    mockApi()
    const user = userEvent.setup()
    renderEditor('e1')
    await screen.findByLabelText('Title')
    expect(blocker.options?.shouldBlockFn()).toBe(false)
    await typeTitle(user, 'Changed')
    expect(blocker.options?.shouldBlockFn()).toBe(true)
  })

  it('edits one language at a time', async () => {
    mockApi()
    const user = userEvent.setup()
    renderEditor('e1')
    await typeTitle(user, 'Hello world')
    await user.click(await screen.findByRole('tab', { name: /Spanish/ }))
    expect(await screen.findByLabelText('Title')).toHaveValue('Hola mundo')
    expect(screen.getAllByLabelText('Title')).toHaveLength(1)
  })

  it('refuses to save over a newer version and offers a reload', async () => {
    mockApi({
      write: {
        status: 409,
        body: {
          error: 'stale',
          code: 'stale_version',
          current: { version: 4, updatedAt: Date.UTC(2026, 10, 8, 12, 30), updatedBy: 'Ana Ruiz' }
        }
      }
    })
    const user = userEvent.setup()
    renderEditor('e1')
    await typeTitle(user, 'Mine')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('A newer version was saved')).toBeInTheDocument()
    expect(screen.getByText(/Ana Ruiz saved this entry/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Mine')
    expect(screen.getByRole('button', { name: 'Reload latest version' })).toBeInTheDocument()
  })
})

describe('EntryEditor publishing', { timeout: 15_000 }, () => {
  it('publishes a saved entry', async () => {
    const writes = mockApi()
    const user = userEvent.setup()
    renderEditor('e1')
    await user.click(await screen.findByRole('button', { name: 'Publish' }))
    await waitFor(() =>
      expect(writes).toContainEqual({
        method: 'POST',
        url: '/api/v1/collections/posts/entries/e1/publish',
        body: { expectedVersion: 1 }
      })
    )
  })

  it('lists the problems that stop an entry from being published', async () => {
    mockApi({
      publish: {
        status: 422,
        body: {
          error: 'unpublishable',
          code: 'unpublishable',
          problems: [{ reason: 'missing_default_locale', blockId: null, path: 'title' }]
        }
      }
    })
    const user = userEvent.setup()
    renderEditor('e1')
    await user.click(await screen.findByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('This entry cannot be published yet')).toBeInTheDocument()
    expect(
      screen.getByText(/The entry has no value in the default language for title/)
    ).toBeInTheDocument()
  })

  it('asks before deleting', async () => {
    const writes = mockApi({})
    const user = userEvent.setup()
    renderEditor('e1')
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }))
    expect(writes).toHaveLength(0)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('has no address field for a collection without a route', async () => {
    mockApi()
    renderEditor('e1')
    await screen.findByLabelText('Title')
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument()
  })

  it('edits the address of a routed collection one locale at a time and saves it', async () => {
    const writes = mockApi({ collections: [routed] })
    const user = userEvent.setup()
    renderEditor('e1')
    const address = await screen.findByLabelText('Address')
    expect(address).toHaveValue('')
    await user.type(address, 'hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(writes[0]?.body).toMatchObject({ slugs: { en: 'hello' } }))
  })
})

describe('EntryEditor key', { timeout: 15_000 }, () => {
  const keyed = {
    ...postsCollection,
    key: 'code',
    schema: {
      ...postsCollection.schema,
      properties: {
        ...postsCollection.schema.properties,
        code: { type: 'string', title: 'Code' }
      }
    }
  }
  const keyedEntry: Entry = {
    ...stored,
    key: 'a1',
    content: { ...(stored.content as object), code: 'a1' }
  }

  it('shows the server error on the key field when the key is taken', async () => {
    mockApi({
      collections: [keyed],
      entry: keyedEntry,
      write: {
        status: 409,
        body: {
          error: 'Taken',
          code: 'key_taken',
          issues: [{ path: ['code'], code: 'key_taken' }]
        }
      }
    })
    const user = userEvent.setup()
    renderEditor('e1')
    const field = await screen.findByLabelText('Code')
    await user.clear(field)
    await user.type(field, 'a2')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Another entry already uses this key.')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInvalid()
  })

  it('locks the key of a published entry', async () => {
    mockApi({
      collections: [keyed],
      entry: { ...keyedEntry, publishedAt: 1, publishedVersion: 1 }
    })
    renderEditor('e1')
    const field = await screen.findByLabelText('Code')
    expect(field).toHaveAttribute('readonly')
    expect(screen.getByText('Locked while published. Unpublish to change it.')).toBeInTheDocument()
  })

  it('leaves the key editable while the entry is a draft', async () => {
    mockApi({ collections: [keyed], entry: keyedEntry })
    renderEditor('e1')
    expect(await screen.findByLabelText('Code')).not.toHaveAttribute('readonly')
  })
})
