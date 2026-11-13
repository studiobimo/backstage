import { EMPTY_SITE_SETTINGS, type SiteSettings } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import i18n from '@/i18n/config'
import { blocker } from '@/test/blocker'
import { testQueryClient } from '@/test/query-client'

import { SettingsPage } from './settings-page'

vi.mock('@tanstack/react-router', async () => (await import('@/test/blocker')).blockerRouterMock)

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
    version: 0,
    current: null
  },
  {
    name: 'footer',
    blocks: [
      { name: 'site-footer', version: 1, schema: footerSchema('tagline') },
      { name: 'site-footer-wide', version: 2, schema: footerSchema('motto') }
    ],
    version: 3,
    current: { block: 'site-footer', schemaVersion: 1, content: { tagline: 'Made by hand' } }
  }
]

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const NEVER_PUBLISHED = { publishedAt: null, publishedBy: null, hasUnpublishedChanges: true }
const LIVE = { publishedAt: 1_700_000_000_000, publishedBy: 'Ana', hasUnpublishedChanges: false }

const defaultReply = (url: string) => {
  if (url.endsWith('/slots')) return reply(200, { slots })
  if (url.endsWith('/site/publication')) return reply(200, { publication: NEVER_PUBLISHED })
  return reply(200, { settings: saved, version: 4 })
}

const mockApi = (
  handler: (method: string, url: string) => Response | undefined = () => undefined
) => {
  const puts: { url: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'PUT') puts.push({ url, body: JSON.parse(init?.body as string) })
      return handler(method, url) ?? defaultReply(url)
    })
  )
  return puts
}

const renderPage = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ToastProvider>
        <Suspense>
          <SettingsPage />
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  )

afterEach(async () => {
  blocker.state = { status: 'idle' }
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
    expect(puts[0]!.body).toMatchObject({ siteName: { en: 'Bimo' }, expectedVersion: 4 })
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
      content: { tagline: 'Still by hand' },
      expectedVersion: 3
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

const refusing = (path: string[]) => (method: string) =>
  method === 'PUT'
    ? reply(400, {
        error: 'Invalid input',
        code: 'invalid',
        issues: [{ path, code: 'too_small', origin: 'string', minimum: 1 }]
      })
    : undefined

const saveGeneral = async (nameLabel: string, saveLabel: string) => {
  await screen.findByLabelText(nameLabel)
  await userEvent.setup().click(
    within(screen.getByRole('region', { name: 'General' })).getByRole('button', {
      name: saveLabel
    })
  )
}

describe('SettingsPage guards', { timeout: 15_000 }, () => {
  it('blocks leaving only while a form has unsaved changes, and asks first', async () => {
    mockApi()
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    expect(blocker.options?.shouldBlockFn()).toBe(false)
    const proceed = vi.fn()
    blocker.state = { status: 'blocked', proceed, reset: vi.fn() }
    await user.type(name, 'o')
    await waitFor(() => expect(blocker.options?.shouldBlockFn()).toBe(true))
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Leave and discard' }))
    expect(proceed).toHaveBeenCalled()
  })

  it('blocks leaving for a slot form too, and lets go once the edit is undone', async () => {
    mockApi()
    renderPage()
    const user = userEvent.setup()
    const tagline = await screen.findByLabelText('Tagline')
    await user.type(tagline, '!')
    await waitFor(() => expect(blocker.options?.shouldBlockFn()).toBe(true))
    await user.type(tagline, '{Backspace}')
    await waitFor(() => expect(blocker.options?.shouldBlockFn()).toBe(false))
  })

  it('asks before a different design replaces the saved one, and saves only when confirmed', async () => {
    const puts = mockApi()
    renderPage()
    const user = userEvent.setup()
    const footer = within(await screen.findByRole('region', { name: 'Footer' }))
    await user.click(footer.getByRole('combobox', { name: 'Design' }))
    await user.click(await screen.findByRole('option', { name: 'site-footer-wide' }))
    await user.type(await screen.findByLabelText('Motto'), 'Loud')
    await user.click(footer.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Replace the saved design?')).toBeInTheDocument()
    expect(puts).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Keep the saved design' }))
    expect(puts).toHaveLength(0)

    await user.click(footer.getByRole('button', { name: 'Save' }))
    await user.click(await screen.findByRole('button', { name: 'Replace it' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]!.body).toMatchObject({ block: 'site-footer-wide', content: { motto: 'Loud' } })
  })

  it('saves a slot with nothing stored without asking', async () => {
    const puts = mockApi()
    renderPage()
    const user = userEvent.setup()
    const header = within(await screen.findByRole('region', { name: 'Header' }))
    await user.click(header.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(screen.queryByText('Replace the saved design?')).not.toBeInTheDocument()
  })
})

const newerSave = { version: 5, updatedAt: Date.UTC(2026, 10, 12, 15, 0), updatedBy: 'Ana' }

const refusedAsStale = (method: string) =>
  method === 'PUT'
    ? reply(409, { error: 'Stale', code: 'stale_version', current: newerSave })
    : undefined

describe('SettingsPage newer saves', { timeout: 15_000 }, () => {
  it('keeps the edit and says who saved first when the settings changed underneath', async () => {
    const puts = mockApi(refusedAsStale)
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    await user.clear(name)
    await user.type(name, 'Mine')
    await user.click(
      within(screen.getByRole('region', { name: 'General' })).getByRole('button', { name: 'Save' })
    )
    const alert = await screen.findByText('A newer version was saved')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText(/Ana saved this on/)).toBeInTheDocument()
    expect(puts[0]!.body).toMatchObject({ expectedVersion: 4 })
    expect(screen.getByLabelText('Site name')).toHaveValue('Mine')
    expect(screen.queryByText('Settings saved')).not.toBeInTheDocument()
    expect(screen.queryByText('Could not save the settings')).not.toBeInTheDocument()
  })

  it('names the slot whose save was refused, and leaves the others alone', async () => {
    mockApi(refusedAsStale)
    renderPage()
    const user = userEvent.setup()
    const tagline = await screen.findByLabelText('Tagline')
    await user.type(tagline, '!')
    const footer = within(screen.getByRole('region', { name: 'Footer' }))
    await user.click(footer.getByRole('button', { name: 'Save' }))
    expect(await footer.findByText('A newer version was saved')).toBeInTheDocument()
    const general = within(screen.getByRole('region', { name: 'General' }))
    expect(general.queryByText('A newer version was saved')).not.toBeInTheDocument()
  })

  it('reloads their version only after confirming the discard', async () => {
    let latest = false
    mockApi((method, url) => {
      if (method === 'PUT') return refusedAsStale(method)
      if (latest && !url.endsWith('/slots')) {
        return reply(200, { settings: { siteName: { en: 'Theirs' } }, version: 5 })
      }
      return undefined
    })
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    await user.type(name, '!')
    await user.click(
      within(screen.getByRole('region', { name: 'General' })).getByRole('button', { name: 'Save' })
    )
    await user.click(await screen.findByRole('button', { name: 'Reload latest version' }))
    expect(await screen.findByText('Reload and discard your changes?')).toBeInTheDocument()
    latest = true
    await user.click(screen.getByRole('button', { name: 'Reload and discard' }))
    await waitFor(() => expect(screen.getByLabelText('Site name')).toHaveValue('Theirs'))
    expect(screen.queryByText('A newer version was saved')).not.toBeInTheDocument()
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

  it('shows the refused issue on its field, in the language that has it', async () => {
    mockApi(refusing(['siteName', 'es']))
    renderPage()
    await saveGeneral('Site name', 'Save')
    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Site name')).toHaveValue('')
    expect(screen.queryByText('Could not save the settings')).not.toBeInTheDocument()
  })

  it('shows the same issue in Spanish when the admin speaks Spanish', async () => {
    mockApi(refusing(['siteName', 'en']))
    await i18n.changeLanguage('es')
    renderPage()
    await saveGeneral('Nombre del sitio', 'Guardar')
    expect(await screen.findByText('Este campo es obligatorio.')).toBeInTheDocument()
  })

  it('puts a whitespace-only name on its field without asking the server', async () => {
    const puts = mockApi()
    renderPage()
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Site name')
    await user.clear(name)
    await user.type(name, '   ')
    await saveGeneral('Site name', 'Save')
    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
    expect(puts).toHaveLength(0)
    expect(screen.queryByText('Could not save the settings')).not.toBeInTheDocument()
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

const PUBLISH_URL = /\/site\/publish$/

const publishRegion = () => within(screen.getByRole('region', { name: 'Publish site' }))

describe('SettingsPage publishing', { timeout: 15_000 }, () => {
  it('says the site is not published and publishes it on request', async () => {
    const requests: string[] = []
    mockApi((method, url) => {
      if (method !== 'POST' || !PUBLISH_URL.test(url)) return undefined
      requests.push(url)
      return reply(200, { publication: LIVE })
    })
    renderPage()
    await screen.findByLabelText('Site name')
    expect(publishRegion().getByText('Not published')).toBeInTheDocument()
    await userEvent.setup().click(publishRegion().getByRole('button', { name: 'Publish site' }))
    expect(await screen.findByText('Site published')).toBeInTheDocument()
    expect(requests).toHaveLength(1)
    expect(publishRegion().getByText('Live')).toBeInTheDocument()
    expect(publishRegion().getByRole('button', { name: 'Publish site' })).toBeDisabled()
  })

  it('names the slot that cannot be published', async () => {
    mockApi((method, url) =>
      method === 'POST' && PUBLISH_URL.test(url)
        ? reply(422, {
            error: 'Cannot publish',
            code: 'unpublishable',
            problems: [{ reason: 'invalid_content', blockId: null, slot: 'header' }]
          })
        : undefined
    )
    renderPage()
    await screen.findByLabelText('Site name')
    await userEvent.setup().click(publishRegion().getByRole('button', { name: 'Publish site' }))
    expect(await screen.findByText('The site cannot be published yet')).toBeInTheDocument()
    expect(screen.getByText(/Header has content that is not valid/)).toBeInTheDocument()
  })

  it('offers to publish saved changes, in Spanish when the admin speaks it', async () => {
    mockApi((_method, url) =>
      url.endsWith('/site/publication')
        ? reply(200, { publication: { ...LIVE, hasUnpublishedChanges: true } })
        : undefined
    )
    await i18n.changeLanguage('es')
    renderPage()
    await screen.findByLabelText('Nombre del sitio')
    const region = within(screen.getByRole('region', { name: 'Publicar el sitio' }))
    expect(region.getByText('Cambios sin publicar')).toBeInTheDocument()
    expect(region.getByRole('button', { name: 'Publicar el sitio' })).toBeEnabled()
  })
})
