import { EMPTY_SITE_SETTINGS, type SiteSettings } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import i18n from '@/i18n/config'

import { SettingsPage } from './settings-page'

const saved: SiteSettings = { ...EMPTY_SITE_SETTINGS, siteName: { en: 'Studio' } }

const headerSchema = {
  type: 'object',
  properties: {
    cta: {
      type: 'object',
      backstage: 'localized',
      additionalProperties: {
        type: 'object',
        backstage: 'link',
        properties: { href: { type: 'string' }, label: { type: 'string' } },
        required: ['href', 'label']
      }
    }
  }
}
const footerSchema = (name: string) => ({
  type: 'object',
  properties: { [name]: { type: 'string', minLength: 1 } },
  required: [name]
})
const slots = [
  {
    name: 'header',
    blocks: [{ name: 'site-header', version: 1, schema: headerSchema }],
    current: null
  },
  {
    name: 'footer',
    blocks: [
      { name: 'site-footer', version: 1, schema: footerSchema('tagline') },
      { name: 'site-footer-wide', version: 2, schema: footerSchema('motto') }
    ],
    current: { block: 'site-footer', schemaVersion: 1, content: { tagline: 'Made by hand' } }
  }
]

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const mockApi = (
  handler: (method: string, url: string) => Response | undefined = () => undefined
) => {
  const puts: { url: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'PUT') puts.push({ url, body: JSON.parse(init?.body as string) })
      return (
        handler(method, url) ??
        (url.endsWith('/slots') ? reply(200, { slots }) : reply(200, { settings: saved }))
      )
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

describe('SettingsPage saving', { timeout: 15_000 }, () => {
  it('shows a General section and one section for each slot', async () => {
    mockApi()
    renderPage()
    expect(await screen.findByLabelText('Site name')).toHaveValue('Studio')
    for (const name of ['General', 'Header', 'Footer']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(screen.queryByRole('region', { name: 'Contact' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tagline')).toHaveValue('Made by hand')
  })

  it('saves the general settings on their own', async () => {
    const puts = mockApi()
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    await user.clear(name)
    await user.type(name, 'Bimo')
    await user.click(
      within(screen.getByRole('region', { name: 'General' })).getByRole('button', { name: 'Save' })
    )
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(puts).toHaveLength(1)
    expect(puts[0]!.url).toMatch(/\/settings$/)
    expect(puts[0]!.body).toMatchObject({ siteName: { en: 'Bimo' } })
  })

  it('saves a slot as its block, with the block version', async () => {
    const puts = mockApi()
    renderPage()
    const user = userEvent.setup()
    const tagline = await screen.findByLabelText('Tagline')
    await user.clear(tagline)
    await user.type(tagline, 'Still by hand')
    await user.click(
      within(screen.getByRole('region', { name: 'Footer' })).getByRole('button', { name: 'Save' })
    )
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]!.url).toMatch(/\/slots\/footer$/)
    expect(puts[0]!.body).toEqual({
      block: 'site-footer',
      schemaVersion: 1,
      content: { tagline: 'Still by hand' }
    })
  })

  it('offers a choice only for a slot with more than one block', async () => {
    mockApi()
    renderPage()
    await screen.findByLabelText('Site name')
    const header = within(screen.getByRole('region', { name: 'Header' }))
    const footer = within(screen.getByRole('region', { name: 'Footer' }))
    expect(header.queryByRole('combobox', { name: 'Design' })).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(footer.getByRole('combobox', { name: 'Design' }))
    await user.click(await screen.findByRole('option', { name: 'site-footer-wide' }))
    expect(await screen.findByLabelText('Motto')).toHaveValue('')
  })
})

describe('SettingsPage editing', { timeout: 15_000 }, () => {
  it('keeps the form and explains when the server refuses', async () => {
    mockApi((method) =>
      method === 'PUT' ? reply(500, { error: 'x', code: 'internal' }) : undefined
    )
    renderPage()
    const user = userEvent.setup()
    await screen.findByLabelText('Site name')
    await user.click(
      within(screen.getByRole('region', { name: 'General' })).getByRole('button', { name: 'Save' })
    )
    expect(await screen.findByText('Could not save the settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Site name')).toHaveValue('Studio')
  })

  it('edits one language at a time and flags the one that is missing', async () => {
    mockApi()
    renderPage()
    const user = userEvent.setup()
    await screen.findByLabelText('Site name')
    const [spanish] = screen.getAllByRole('button', { name: /Spanish/ })
    expect(spanish).toHaveTextContent('missing')
    await user.click(spanish!)
    await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue(''))
  })

  it('speaks Spanish when the admin does', async () => {
    mockApi()
    await i18n.changeLanguage('es')
    renderPage()
    expect(await screen.findByLabelText('Nombre del sitio')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pie de página' })).toBeInTheDocument()
  })
})
