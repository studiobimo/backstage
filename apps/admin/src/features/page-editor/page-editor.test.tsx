import type { Page, PageBlock } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PageEditor } from './page-editor'

const blocker = vi.hoisted(() => ({
  options: undefined as { shouldBlockFn: () => boolean } | undefined,
  state: { status: 'idle' } as Record<string, unknown>
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/pages">{children}</a>,
  useBlocker: (options: { shouldBlockFn: () => boolean }) => {
    blocker.options = options
    return blocker.state
  }
}))

const about: Page = {
  id: 'p1',
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 0,
  locales: [{ locale: 'en', slug: 'about', title: 'About' }]
}
const hero = {
  name: 'hero',
  version: 1,
  schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] }
}
const saved: PageBlock[] = [
  { id: 'a', block: 'hero', schemaVersion: 1, content: { title: 'One' } },
  { id: 'b', block: 'hero', schemaVersion: 1, content: { title: 'Two' } }
]

const STALE_BODY = {
  code: 'stale_version',
  error: 'A newer version of this page was saved',
  current: { version: 4, updatedAt: Date.UTC(2026, 10, 8, 12, 30), updatedBy: 'Ana Ruiz' }
}

const mockApi = (initial: PageBlock[], options: { stale?: boolean } = {}) => {
  const puts: { blocks: PageBlock[]; expectedVersion: number }[] = []
  const layoutPuts: { layout: string; expectedVersion: number }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' && options.stale) {
        return new Response(JSON.stringify(STALE_BODY), { status: 409 })
      }
      if (init?.method === 'PUT' && url.endsWith('/layout')) {
        const body = JSON.parse(init.body as string) as { layout: string; expectedVersion: number }
        layoutPuts.push(body)
        const page = { ...about, layout: body.layout, version: body.expectedVersion + 1 }
        return new Response(JSON.stringify({ page }))
      }
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body as string) as {
          blocks: PageBlock[]
          expectedVersion: number
        }
        puts.push(body)
        return new Response(
          JSON.stringify({ ...body, version: body.expectedVersion + 1, layout: 'default' })
        )
      }
      if (url.endsWith('/layouts')) {
        return new Response(JSON.stringify({ layouts: ['default', 'minimal', 'bare'] }))
      }
      if (url.endsWith('/blocks') && url.includes('/pages/')) {
        return new Response(JSON.stringify({ blocks: initial, version: 3, layout: 'default' }))
      }
      if (url.endsWith('/blocks')) return new Response(JSON.stringify({ blocks: [hero] }))
      return new Response(JSON.stringify({ pages: [about] }))
    })
  )
  return Object.assign(puts, { layouts: layoutPuts })
}

const renderEditor = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Suspense>
        <PageEditor pageId="p1" />
      </Suspense>
    </QueryClientProvider>
  )

const removeFirstAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click((await screen.findAllByRole('button', { name: 'Remove hero' }))[0]!)
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

const rows = async () => within(await screen.findByRole('list')).getAllByRole('listitem')

afterEach(() => {
  vi.unstubAllGlobals()
  blocker.state = { status: 'idle' }
})

describe('PageEditor', { timeout: 15_000 }, () => {
  it('shows an empty state and adds a block from the picker', async () => {
    mockApi([])
    const user = userEvent.setup()
    renderEditor()
    expect(await screen.findByText('No blocks yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add block' }))
    await user.click(await screen.findByRole('menuitem', { name: 'hero' }))
    expect(await rows()).toHaveLength(1)
  })

  it('duplicates and removes blocks, then saves the arrangement', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    expect(await rows()).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: 'Duplicate hero' })[0]!)
    expect(await rows()).toHaveLength(3)
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[2]!)
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[1]!)
    expect(await rows()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]!.blocks.map((block) => block.content)).toEqual([{ title: 'One' }])
    expect(puts[0]!.expectedVersion).toBe(3)
  })

  it('gives each row a drag handle for pointer, touch and keyboard sorting', async () => {
    mockApi(saved)
    renderEditor()
    expect(await screen.findAllByRole('button', { name: 'Reorder hero' })).toHaveLength(2)
  })

  it('picks a layout for the page and saves it without touching the blocks', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    const picker = await screen.findByRole('combobox', { name: 'Layout' })
    expect(picker).toHaveTextContent('Default')
    await user.click(picker)
    await user.click(await screen.findByRole('option', { name: 'Minimal' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts.layouts).toEqual([{ layout: 'minimal', expectedVersion: 3 }]))
    expect(puts).toHaveLength(0)
  })

  it('saves the blocks first and the layout on top of the version they produced', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('combobox', { name: 'Layout' }))
    await user.click(await screen.findByRole('option', { name: 'Bare' }))
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts.layouts).toHaveLength(1))
    expect(puts[0]!.expectedVersion).toBe(3)
    expect(puts.layouts[0]).toEqual({ layout: 'bare', expectedVersion: 4 })
  })

  it('refuses to save over a newer version, names who saved it and offers a reload', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('A newer version was saved')
    expect(alert).toHaveTextContent('Ana Ruiz saved this page on')
    expect(within(alert).getByRole('button', { name: 'Reload latest version' })).toBeEnabled()
  })

  it('drops the draft when the newer version is reloaded', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    await user.click(await screen.findByRole('button', { name: 'Reload latest version' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await rows()).toHaveLength(2)
  })

  it('blocks leaving only while there are unsaved changes, and asks first', async () => {
    mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    await user.click((await screen.findAllByRole('button', { name: 'Remove hero' }))[0]!)
    expect(blocker.options?.shouldBlockFn()).toBe(true)

    const proceed = vi.fn()
    const reset = vi.fn()
    blocker.state = { status: 'blocked', proceed, reset }
    await user.click(screen.getByRole('button', { name: 'Remove hero' }))
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Leave and discard' }))
    expect(proceed).toHaveBeenCalled()
  })

  it('does not block leaving a clean page', async () => {
    mockApi(saved)
    renderEditor()
    await rows()
    expect(blocker.options?.shouldBlockFn()).toBe(false)
  })
})
