import type { PageBlock } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { PublishNotes } from './publish-notes'
import { SavePublishGroup } from './save-publish-group'
import { usePublish } from './use-publish'
import { useSaveShortcut } from './use-save-shortcut'

const blocks: PageBlock[] = [{ id: 'b1', block: 'hero', schemaVersion: 1, content: {} }]

const mockPublish = (response: Response) => {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

interface HarnessProps {
  dirty: boolean
  publishedAt: number | null
  onSave: () => void
}

function Harness({ dirty, publishedAt, onSave }: HarnessProps) {
  const page = { ...aboutPage, publishedAt, publishedBy: 'Ana Ruiz' }
  const publish = usePublish(page, 3)
  useSaveShortcut(dirty, onSave)
  return (
    <>
      <SavePublishGroup
        name="About"
        hintId="hint"
        dirty={dirty}
        saving={false}
        published={publishedAt !== null}
        publishing={publish.publishing}
        unpublishing={publish.unpublishing}
        onSave={onSave}
        onPublish={publish.publish}
        onUnpublish={publish.unpublish}
      />
      <PublishNotes page={page} dirty={dirty} error={publish.error} blocks={blocks} hintId="hint" />
    </>
  )
}

const renderGroup = (props: Partial<HarnessProps> = {}) => {
  const onSave = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness dirty={false} publishedAt={null} onSave={onSave} {...props} />
    </QueryClientProvider>
  )
  return { onSave, user: userEvent.setup() }
}

afterEach(() => vi.unstubAllGlobals())

describe('SavePublishGroup', () => {
  it('asks to save first and disables publishing while there are unsaved changes', () => {
    renderGroup({ dirty: true })
    expect(screen.getByText('Save your changes to publish them.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /Save/ }).hasAttribute('disabled')).toBe(false)
  })

  it('keeps Save off while nothing changed', () => {
    renderGroup()
    expect(screen.getByRole('button', { name: /Save/ }).hasAttribute('disabled')).toBe(true)
  })

  it('saves from the keyboard only while there are unsaved changes', async () => {
    const dirty = renderGroup({ dirty: true })
    await dirty.user.keyboard('{Control>}s{/Control}')
    expect(dirty.onSave).toHaveBeenCalledTimes(1)
  })

  it('publishes the saved version', async () => {
    const fetchMock = mockPublish(new Response(JSON.stringify({ page: aboutPage })))
    const { user } = renderGroup()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
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
    const { user } = renderGroup()
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText(/The block hero has content that is not valid/)).toBeTruthy()
  })

  it('offers Unpublish from the attached menu only for a published page, and confirms first', async () => {
    const fetchMock = mockPublish(new Response(JSON.stringify({ page: aboutPage })))
    const { user } = renderGroup({ publishedAt: Date.UTC(2026, 10, 9, 8, 0) })
    await user.click(screen.getByRole('button', { name: 'More publishing options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Unpublish' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Unpublish' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })

  it('has no menu for a page that is not live', () => {
    renderGroup()
    expect(screen.queryByRole('button', { name: 'More publishing options' })).toBeNull()
  })
})
