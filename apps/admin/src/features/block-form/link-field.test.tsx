import { link } from '@studiobimo/backstage'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { testQueryClient } from '@/test/query-client'

import type { JsonSchema } from './spec.ts'
import type { BlockValue } from './value.ts'
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

const renderForm = (cta: unknown, onSubmit: (value: BlockValue) => void, formSchema = schema) =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <BlockForm
        schema={formSchema}
        locales={['en']}
        value={{ cta } as never}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>
  )

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
})

describe('the link field in a form', () => {
  useStubbedListing(listing)

  it('tells the editor to choose a page when saving a page link with none', async () => {
    const user = userEvent.setup({ delay: null })
    renderForm({ kind: 'page', pageId: '', label: 'Go' }, vi.fn())
    expect(screen.queryByText('Choose the page to link to.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Choose the page to link to.')).toBeInTheDocument()
  })

  it('saves a page link once a page is chosen, with no error left', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderForm({ kind: 'page', pageId: '', label: 'Go' }, onSubmit)
    await user.click(screen.getByRole('button', { name: /Choose a page/ }))
    await user.click(await screen.findByRole('option', { name: /About/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        cta: { kind: 'page', pageId: 'about', label: 'Go' }
      })
    )
    expect(screen.queryByText('Choose the page to link to.')).not.toBeInTheDocument()
  })

  it('goes from a page back to an address and saves the address', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderForm({ kind: 'page', pageId: 'about', label: 'Go' }, onSubmit)
    await user.click(screen.getByRole('tab', { name: 'An address' }))
    await user.type(await screen.findByRole('textbox', { name: 'Address' }), '/contact')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ cta: { href: '/contact', label: 'Go' } })
    )
  })

  it('offers only an address when the site predates page links', () => {
    const legacy = z.toJSONSchema(
      z
        .object({
          cta: z
            .object({ href: z.string().min(1), label: z.string().default('') })
            .meta({ backstage: 'link' })
        })
        .meta({}),
      { io: 'input' }
    ) as JsonSchema
    renderForm({ href: '/old', label: 'Go' }, vi.fn(), legacy)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('/old')
  })
})
