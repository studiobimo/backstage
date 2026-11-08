import type { Page, PageBlock } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PageEditor } from './page-editor'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/pages">{children}</a>
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

const mockApi = (initial: PageBlock[]) => {
  const puts: { blocks: PageBlock[] }[] = []
  const layoutPuts: { layout: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' && url.endsWith('/layout')) {
        layoutPuts.push(JSON.parse(init.body as string))
        return new Response(null, { status: 200 })
      }
      if (init?.method === 'PUT') {
        const body = JSON.parse(init.body as string) as { blocks: PageBlock[] }
        puts.push(body)
        return new Response(JSON.stringify(body))
      }
      if (url.endsWith('/layouts')) {
        return new Response(JSON.stringify({ layouts: ['default', 'minimal', 'bare'] }))
      }
      if (url.endsWith('/blocks') && url.includes('/pages/')) {
        return new Response(JSON.stringify({ blocks: initial }))
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

const rows = async () => within(await screen.findByRole('list')).getAllByRole('listitem')

afterEach(() => vi.unstubAllGlobals())

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
    await waitFor(() => expect(puts.layouts).toEqual([{ layout: 'minimal' }]))
    expect(puts).toHaveLength(0)
  })
})
