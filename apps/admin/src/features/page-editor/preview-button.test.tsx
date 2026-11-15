import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { testQueryClient } from '@/test/query-client'

import { PreviewButton } from './preview-button'
import { usePreview } from './use-preview'

const TOKEN = 'a'.repeat(43)
const SITE = 'https://site.example'

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const mockApi = (preview: Response) => {
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith('/site-origin') ? respond({ origin: SITE }) : preview
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const mockWindow = () => {
  const opened = { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
  const open = vi.fn(() => opened)
  vi.stubGlobal('open', open)
  return { opened, open }
}

function Harness({ dirty = false }: { dirty?: boolean }) {
  const { previewing, preview } = usePreview('p1')
  return (
    <PreviewButton hintId="hint" disabled={dirty} previewing={previewing} onPreview={preview} />
  )
}

const renderButton = (dirty = false) => {
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ToastProvider>
        <Harness dirty={dirty} />
      </ToastProvider>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

afterEach(() => vi.unstubAllGlobals())

describe('PreviewButton', () => {
  it('asks the API for a preview and opens the site link in the window it opened', async () => {
    const fetchMock = mockApi(
      respond({ token: TOKEN, path: `/__preview/pages/${TOKEN}`, expiresAt: 1 }, 201)
    )
    const { opened } = mockWindow()
    const user = renderButton()
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await waitFor(() => expect(opened.location.href).toBe(`${SITE}/__preview/pages/${TOKEN}`))
    expect(opened.opener).toBeNull()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/pages/p1/preview')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('closes the window and says why when the page cannot be previewed', async () => {
    mockApi(respond({ error: 'x', code: 'unpublishable', problems: [] }, 422))
    const { opened } = mockWindow()
    const user = renderButton()
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(await screen.findByText('Could not open the preview')).toBeTruthy()
    expect(opened.close).toHaveBeenCalled()
  })

  it('is off while there are unsaved changes, since a preview shows the saved draft', () => {
    renderButton(true)
    expect(screen.getByRole('button', { name: 'Preview' }).hasAttribute('disabled')).toBe(true)
  })
})
