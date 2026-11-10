import type { PageSummary } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { PagesPage } from './pages-page'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="/pages/p1" className={className}>
      {children}
    </a>
  ),
  useNavigate: () => navigate
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

afterEach(() => {
  vi.unstubAllGlobals()
  navigate.mockClear()
})

const renderPages = (pages: PageSummary[]) => {
  mockApi(() => reply(200, { pages }))
  renderPage()
  return userEvent.setup()
}

const choose = async (user: ReturnType<typeof userEvent.setup>, item: string) => {
  await openRowMenu(user, 'About')
  await user.click(await screen.findByRole('menuitem', { name: item }))
}

const openRowMenu = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole('button', { name: `Actions for ${name}` }))

describe('PagesPage', { timeout: 15_000 }, () => {
  it('lists pages with their address in each locale', async () => {
    mockApi(() => reply(200, { pages: [aboutPage] }))
    renderPage()
    expect(await screen.findByText('/en/about')).toBeInTheDocument()
    expect(screen.getByText('/es/acerca')).toBeInTheDocument()
  })

  it('flags the languages a page is missing translations in', async () => {
    const team: PageSummary = { ...aboutPage, id: 'p2', missing: { en: 0, es: 3 } }
    mockApi(() => reply(200, { pages: [aboutPage, team] }))
    renderPage()
    expect(await screen.findAllByText('3 missing in Spanish')).toHaveLength(2)
    expect(screen.getAllByText(/missing in/)).toHaveLength(2)
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
    await choose(user, 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Delete page' }))
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true))
  })
})

describe('PagesPage row actions', { timeout: 15_000 }, () => {
  it('opens the details of a page from its row menu', async () => {
    await choose(renderPages([aboutPage]), 'Details')
    expect(await screen.findByText('Page details')).toBeInTheDocument()
  })

  it('opens the page editor from the row menu', async () => {
    await choose(renderPages([aboutPage]), 'Edit blocks')
    expect(navigate).toHaveBeenCalledWith({ to: '/pages/$pageId', params: { pageId: 'p1' } })
  })

  it('gives each row one link, the title, that stretches over the row', async () => {
    renderPages([aboutPage])
    const row = (await screen.findByRole('link', { name: 'About' })).closest('tr') as HTMLElement
    expect(within(row).getAllByRole('link')).toHaveLength(1)
    expect(within(row).getByRole('link')).toHaveClass('after:absolute', 'after:inset-0')
    expect(within(row).getByRole('button', { name: 'Actions for About' }).closest('a')).toBeNull()
  })
})

const homePage: PageSummary = {
  ...aboutPage,
  isHome: true,
  locales: [
    { locale: 'en', slug: null, title: 'Welcome' },
    { locale: 'es', slug: null, title: 'Bienvenida' }
  ]
}

const livePage: PageSummary = {
  ...aboutPage,
  id: 'p2',
  publishedAt: 1,
  locales: [
    { locale: 'en', slug: 'team', title: 'Team' },
    { locale: 'es', slug: 'equipo', title: 'Equipo' }
  ]
}

describe('PagesPage table', { timeout: 15_000 }, () => {
  it('shows the home page address once', async () => {
    renderPages([homePage])
    await screen.findByRole('link', { name: 'Welcome' })
    expect(screen.getAllByText('/')).toHaveLength(1)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('filters by status with a count on each tab', async () => {
    const user = renderPages([aboutPage, livePage])
    expect(await screen.findByRole('tab', { name: /^All ?2$/ })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /^Published ?1$/ }))
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument()
  })

  it('searches pages and says when none match', async () => {
    const user = renderPages([aboutPage])
    const search = await screen.findByRole('searchbox', { name: 'Search pages' })
    await user.type(search, 'zzz')
    expect(screen.getByText('No pages match')).toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'acerca')
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
  })
})
