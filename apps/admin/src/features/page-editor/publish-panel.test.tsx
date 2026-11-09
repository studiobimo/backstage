import type { PageBlock } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { aboutPage } from '@/test/fixtures'
import { PublishPanel } from './publish-panel'

const blocks: PageBlock[] = [{ id: 'b1', block: 'hero', schemaVersion: 1, content: {} }]

const mockPublish = (response: Response) => {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderPanel = (props: { dirty?: boolean; publishedAt?: number } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PublishPanel
        page={{ ...aboutPage, publishedAt: props.publishedAt ?? null, publishedBy: 'Ana Ruiz' }}
        name="About"
        version={3}
        blocks={blocks}
        dirty={props.dirty ?? false}
      />
    </QueryClientProvider>
  )

afterEach(() => vi.unstubAllGlobals())

describe('PublishPanel', () => {
  it('asks to save first and disables publishing while there are unsaved changes', () => {
    renderPanel({ dirty: true })
    expect(screen.getByText('Save your changes to publish them.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(true)
  })

  it('publishes the saved version', async () => {
    const fetchMock = mockPublish(new Response(JSON.stringify({ page: aboutPage })))
    renderPanel()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/pages/p1/publish')
    expect(JSON.parse(init.body as string)).toEqual({ expectedVersion: 3 })
  })

  it('names the block that stops a page from publishing', async () => {
    mockPublish(
      new Response(
        JSON.stringify({
          error: 'x',
          code: 'unpublishable',
          problems: [{ reason: 'invalid_content', blockId: 'b1' }]
        }),
        { status: 422 }
      )
    )
    renderPanel()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText(/The block hero has content that is not valid/)).toBeTruthy()
  })

  it('confirms before unpublishing', async () => {
    const fetchMock = mockPublish(new Response(JSON.stringify({ page: aboutPage })))
    renderPanel({ publishedAt: Date.UTC(2026, 10, 9, 8, 0) })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Unpublish' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Unpublish', hidden: false }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })
})
