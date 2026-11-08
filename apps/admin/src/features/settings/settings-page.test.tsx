import { EMPTY_SITE_SETTINGS, type SiteSettings } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import i18n from '@/i18n/config'

import { SettingsPage } from './settings-page'

const saved: SiteSettings = {
  ...EMPTY_SITE_SETTINGS,
  siteName: { en: 'Studio' },
  navigation: [{ en: { href: '/about', label: 'About' } }]
}

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const mockApi = (handler: (method: string) => Response) => {
  const puts: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'PUT') puts.push(JSON.parse(init?.body as string))
      return handler(method)
    })
  )
  return puts
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>
        <Suspense>
          <SettingsPage />
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  )

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
})

describe('SettingsPage', { timeout: 15_000 }, () => {
  it('shows the saved settings with a label for every section', async () => {
    mockApi(() => reply(200, { settings: saved }))
    renderPage()
    expect(await screen.findByLabelText('Site name')).toHaveValue('Studio')
    for (const name of ['Navigation', 'Footer', 'Contact details', 'Default social image']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument()
  })

  it('saves what was typed and confirms it', async () => {
    const puts = mockApi(() => reply(200, { settings: saved }))
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    await user.clear(name)
    await user.type(name, 'Bimo')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(puts).toHaveLength(1)
    expect(puts[0]).toMatchObject({ siteName: { en: 'Bimo' } })
  })

  it('refuses to save an unsafe link address and returns to it', async () => {
    const puts = mockApi(() => reply(200, { settings: saved }))
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'About' }))
    const [address] = await screen.findAllByLabelText('Address')
    await user.clear(address)
    await user.type(address, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a valid value.')).toBeInTheDocument()
    expect(address).toHaveFocus()
    expect(puts).toHaveLength(0)
  })

  it('keeps the form and explains when the server refuses', async () => {
    mockApi((method) =>
      method === 'PUT'
        ? reply(500, { error: 'x', code: 'internal' })
        : reply(200, { settings: saved })
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Could not save the settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Site name')).toHaveValue('Studio')
  })

  it('edits one language at a time and flags the one that is missing', async () => {
    mockApi(() => reply(200, { settings: saved }))
    renderPage()
    const user = userEvent.setup()
    await screen.findByLabelText('Site name')
    expect(screen.getByRole('button', { name: /Spanish/ })).toHaveTextContent('missing')
    await user.click(screen.getByRole('button', { name: /Spanish/ }))
    await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue(''))
  })

  it('speaks Spanish when the admin does', async () => {
    mockApi(() => reply(200, { settings: saved }))
    await i18n.changeLanguage('es')
    renderPage()
    expect(await screen.findByLabelText('Nombre del sitio')).toBeInTheDocument()
    expect(screen.getByText('Pie de página')).toBeInTheDocument()
  })
})
