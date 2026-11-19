import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { testQueryClient } from '@/test/query-client'

import { MediaPage } from './media-page'
import { MediaPicker } from './media-picker'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/pages/p1">{children}</a>
}))

const image = (id: string, filename: string, overrides: object = {}) => ({
  id,
  filename,
  contentType: 'image/jpeg',
  size: 2 * 1024 * 1024,
  width: 800,
  height: 600,
  decorative: false,
  alt: { en: 'Described', es: 'Descrita' },
  ...overrides
})

const LIBRARY = [
  image('m1', 'chair.jpg'),
  image('m2', 'table.png', { alt: { en: 'A table', es: '' } }),
  image('m3', 'divider.png', { decorative: true, alt: {} })
]

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const stubApi = (handler: (method: string, url: string) => Response) => {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push(`${method} ${url}`)
      return handler(method, url)
    })
  )
  return calls
}

const libraryApi = (media = LIBRARY) =>
  stubApi((method) => (method === 'GET' ? reply(200, { media }) : reply(204)))

const renderInProviders = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  )

afterEach(() => vi.unstubAllGlobals())

describe('MediaPage library', () => {
  it('lists every image with its alt text status', async () => {
    libraryApi()
    renderInProviders(<MediaPage />)
    expect(await screen.findByText('chair.jpg')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Media' })).toBeInTheDocument()
    expect(screen.getByText('3 images')).toBeInTheDocument()
    expect(screen.getAllByText('800 × 600 px · 2 MB')).toHaveLength(3)
    expect(screen.getAllByText('Described')).toHaveLength(1)
    expect(screen.getByText('Needs description')).toBeInTheDocument()
    expect(screen.getByText('Decorative')).toBeInTheDocument()
  })

  it('shows the storage used against the free tier budget', async () => {
    libraryApi()
    renderInProviders(<MediaPage />)
    const meter = await screen.findByRole('meter')
    expect(meter).toHaveAccessibleName('Storage used')
    expect(meter).toHaveAttribute('aria-valuemax', String(10 * 1024 * 1024 * 1024))
    expect(meter).toHaveAttribute('aria-valuenow', String(3 * 2 * 1024 * 1024))
    expect(screen.getByText('6 MB of 10 GB')).toBeInTheDocument()
  })

  it('filters by file name and by description, and says when nothing matches', async () => {
    libraryApi()
    renderInProviders(<MediaPage />)
    await screen.findByText('chair.jpg')
    const search = screen.getByRole('searchbox', { name: 'Search images' })
    await userEvent.type(search, 'table')
    expect(screen.queryByText('chair.jpg')).toBeNull()
    expect(screen.getByText('table.png')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    expect(screen.getByText('No images match')).toBeInTheDocument()
  })

  it('invites the first upload when the library is empty', async () => {
    libraryApi([])
    renderInProviders(<MediaPage />)
    expect(await screen.findByText('No images uploaded yet')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('opens the upload form in a dialog', async () => {
    libraryApi()
    renderInProviders(<MediaPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Upload an image' }))
    const dialog = await screen.findByRole('dialog', { name: 'New image' })
    expect(within(dialog).getByLabelText('Image')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Upload image' })).toBeDisabled()
  })
})

describe('MediaPage delete', () => {
  const openDelete = async () => {
    renderInProviders(<MediaPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete chair.jpg' }))
    return screen.findByRole('alertdialog')
  }

  it('deletes an unused image after confirmation', async () => {
    const calls = libraryApi()
    const dialog = await openDelete()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete image' }))
    await waitFor(() => expect(calls).toContain('DELETE /api/v1/media/m1'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('names the pages that use an image the server refused to delete', async () => {
    stubApi((method) =>
      method === 'GET'
        ? reply(200, { media: LIBRARY })
        : reply(409, {
            error: 'x',
            code: 'media_in_use',
            usedBy: [
              { kind: 'page', id: 'p1', label: { en: 'About us', es: 'Acerca de' } },
              { kind: 'site', id: 'site', label: {} }
            ]
          })
    )
    const dialog = await openDelete()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete image' }))
    const alert = await within(dialog).findByText(/still in use/)
    expect(alert).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'About us' })).toBeInTheDocument()
    expect(within(dialog).getByText('The site settings and layout')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('MediaPicker', () => {
  const openPicker = async (onChange = vi.fn()) => {
    libraryApi()
    renderInProviders(<MediaPicker label="Hero image" value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose Hero image' }))
    await screen.findByRole('radio', { name: 'chair.jpg' })
    return onChange
  }

  it('shows the alt text state of each image', async () => {
    await openPicker()
    expect(screen.getByText('Needs description')).toBeInTheDocument()
    expect(screen.getByText('Decorative')).toBeInTheDocument()
  })

  it('searches the library and picks an image', async () => {
    const onChange = await openPicker()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search images' }), 'table')
    expect(screen.queryByRole('radio', { name: 'chair.jpg' })).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'table.png' }))
    expect(onChange).toHaveBeenCalledWith('m2')
  })
})
