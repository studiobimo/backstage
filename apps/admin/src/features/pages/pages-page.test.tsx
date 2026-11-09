import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { PagesPage } from './pages-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: ReactNode; 'aria-label'?: string }) => (
    <a href="/pages/p1" aria-label={props['aria-label']}>
      {children}
    </a>
  )
}))

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const mockApi = (handler: (method: string, body?: string) => Response) => {
  const calls: { method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ method, body: init?.body as string | undefined })
      return handler(method, init?.body as string | undefined)
    })
  )
  return calls
}

const panel = (name: RegExp) => within(screen.getByRole('tabpanel', { name }))
const getField = (name: RegExp, label: string) => panel(name).getByLabelText(label)
const findField = async (name: RegExp, label: string) => {
  await screen.findByRole('tabpanel', { name })
  return getField(name, label)
}

const fillTitles = async (titles: { English: string; Español?: string }) => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'New page' }))
  await user.type(await findField(/English/, 'Title'), titles.English)
  if (titles.Español) {
    await user.click(screen.getByRole('tab', { name: /Español/ }))
    await user.type(getField(/Español/, 'Title'), titles.Español)
  }
  return user
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Suspense>
        <PagesPage />
      </Suspense>
    </QueryClientProvider>
  )

afterEach(() => vi.unstubAllGlobals())

describe('PagesPage', { timeout: 15_000 }, () => {
  it('lists pages with their address in each locale', async () => {
    mockApi(() => reply(200, { pages: [aboutPage] }))
    renderPage()
    expect(await screen.findByText('/en/about')).toBeInTheDocument()
    expect(screen.getByText('/es/acerca')).toBeInTheDocument()
  })

  it('creates a page, filling each address from its title', async () => {
    const calls = mockApi((method) =>
      method === 'POST' ? reply(201, { page: aboutPage }) : reply(200, { pages: [] })
    )
    renderPage()
    const user = await fillTitles({ English: 'About us', Español: 'Acerca de' })
    await user.click(screen.getByRole('button', { name: 'Create page' }))
    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true))
    expect(JSON.parse(calls.find((call) => call.method === 'POST')?.body ?? '{}')).toEqual({
      isHome: false,
      slugs: { en: 'about-us', es: 'acerca-de' },
      titles: { en: 'About us', es: 'Acerca de' }
    })
  })

  it('flags the locale tab that still needs work', async () => {
    mockApi(() => reply(200, { pages: [] }))
    renderPage()
    const user = await fillTitles({ English: 'About' })
    await user.click(screen.getByRole('button', { name: 'Create page' }))
    expect(await screen.findByRole('tab', { name: /Español/ })).toHaveTextContent('Fix')
  })

  it('shows the server’s refusal of a taken slug', async () => {
    mockApi((method) =>
      method === 'POST' ? reply(409, { error: 'x', code: 'slug_taken' }) : reply(200, { pages: [] })
    )
    renderPage()
    const user = await fillTitles({ English: 'About', Español: 'Acerca' })
    await user.click(screen.getByRole('button', { name: 'Create page' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already uses that address')
  })

  it('deletes a page after confirming', async () => {
    const calls = mockApi((method) =>
      method === 'DELETE' ? reply(204) : reply(200, { pages: [aboutPage] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Delete About' }))
    await user.click(await screen.findByRole('button', { name: 'Delete page' }))
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true))
  })
})
