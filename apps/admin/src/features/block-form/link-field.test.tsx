import { link } from '@studiobimo/backstage'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { testQueryClient } from '@/test/query-client'

import type { JsonSchema } from './spec.ts'
import { BlockForm } from './block-form.tsx'
import { lastFieldValue, renderField, useStubbedListing } from './test-support.tsx'

const schema = z.toJSONSchema(z.object({ cta: link() }), { io: 'input' }) as JsonSchema

const page = (id: string, title: string, published: boolean) => ({
  id,
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 1,
  publishedAt: published ? 2 : null,
  publishedVersion: published ? 1 : null,
  publishedBy: null,
  locales: [{ locale: 'en', slug: id, title }],
  missing: {}
})

const listing = { pages: [page('about', 'About', true), page('draft', 'Draft page', false)] }

const setup = (cta: unknown) => renderField(schema, 'cta', cta)

const lastCta = (onChange: ReturnType<typeof vi.fn>) => lastFieldValue(onChange, 'cta')

describe('the link field', () => {
  useStubbedListing(listing)

  it('keeps typing an address when the link points at one', async () => {
    const { user, onChange } = setup({ href: '/old', label: 'Go' })
    expect(screen.getByRole('tab', { name: 'An address', selected: true })).toBeInTheDocument()
    const address = screen.getByRole('textbox', { name: 'Address' })
    await user.clear(address)
    await user.type(address, '/new')
    await waitFor(() => expect(lastCta(onChange)).toEqual({ href: '/new', label: 'Go' }))
  })

  it('picks a page by searching and keeps the label', async () => {
    const { user, onChange } = setup({ href: '/old', label: 'Go' })
    await user.click(screen.getByRole('tab', { name: 'A page' }))
    await waitFor(() =>
      expect(lastCta(onChange)).toEqual({ kind: 'page', pageId: '', label: 'Go' })
    )
    await user.click(screen.getByRole('button', { name: /Choose a page/ }))
    await user.type(await screen.findByPlaceholderText('Search pages'), 'abo')
    expect(screen.queryByRole('option', { name: /Draft page/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: /About/ }))
    await waitFor(() =>
      expect(lastCta(onChange)).toEqual({ kind: 'page', pageId: 'about', label: 'Go' })
    )
  })

  it('names the chosen page and warns when it is not published', async () => {
    setup({ kind: 'page', pageId: 'draft', label: 'Go' })
    expect(await screen.findByRole('button', { name: /Draft page/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('not published')
    expect(screen.queryByRole('textbox', { name: 'Address' })).not.toBeInTheDocument()
  })

  it('says so when the chosen page no longer exists', async () => {
    setup({ kind: 'page', pageId: 'gone', label: '' })
    expect(await screen.findByRole('button', { name: /Page not found/ })).toBeInTheDocument()
  })

  it('tells the editor to choose a page when saving a page link with none', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <QueryClientProvider client={testQueryClient()}>
        <BlockForm
          schema={schema}
          locales={['en']}
          value={{ cta: { kind: 'page', pageId: '', label: 'Go' } } as never}
          onSubmit={vi.fn()}
        />
      </QueryClientProvider>
    )
    expect(screen.queryByText('Choose the page to link to.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Choose the page to link to.')).toBeInTheDocument()
  })
})
