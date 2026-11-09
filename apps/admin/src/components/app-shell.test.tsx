import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'
import { createAppRouter } from '@/router'

const about = {
  id: 'p1',
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 0,
  locales: [
    { locale: 'en', slug: 'about', title: 'About' },
    { locale: 'es', slug: 'acerca', title: 'Acerca' }
  ]
}

const apiBodies: Record<string, unknown> = {
  '/api/v1/pages': { pages: [about] },
  '/api/v1/pages/p1/blocks': { blocks: [], layout: 'default', version: 1 },
  '/api/v1/blocks': { blocks: [] },
  '/api/v1/layouts': { layouts: ['default'] }
}

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(apiBodies[new URL(url, 'http://x').pathname]))
    )
  )
}

async function renderShell(path = '/') {
  const queryClient = new QueryClient()
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('heading', { level: 1 })
}

describe('app shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    return i18n.changeLanguage('en')
  })

  it('has a sidebar with the navigation, a theme toggle and a language switcher', async () => {
    await renderShell()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: /theme/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows its strings in Spanish when the language changes', async () => {
    await renderShell()
    await i18n.changeLanguage('es')
    expect(await screen.findByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches the language from the switcher', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Language' }))
    await user.click(await screen.findByRole('option', { name: 'Español' }))
    expect(await screen.findByRole('link', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('names the current page in the breadcrumb', async () => {
    await renderShell('/type')
    expect(
      screen.getByText('Type specimen', { selector: '[aria-current="page"]' })
    ).toBeInTheDocument()
  })

  it('names the page being edited under its section in the breadcrumb', async () => {
    stubApi()
    await renderShell('/pages/p1')
    expect(await screen.findByRole('link', { name: 'Pages' })).toHaveAttribute('href', '/pages')
    expect(
      await screen.findByText('About', { selector: '[aria-current="page"]' })
    ).toBeInTheDocument()
  })

  it('opens a section of the navigation to show its items', async () => {
    await renderShell()
    const user = userEvent.setup()
    expect(screen.queryByRole('link', { name: 'All pages' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pages' }))
    expect(await screen.findByRole('link', { name: 'All pages' })).toBeInTheDocument()
  })

  it('links the settings section to the site settings', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(await screen.findByRole('link', { name: 'General' })).toHaveAttribute(
      'href',
      '/settings'
    )
  })
})
