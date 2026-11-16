import { defineCollection, entries, localized } from '@studiobimo/backstage'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { testQueryClient } from '@/test/query-client'

import { BlockForm } from './block-form.tsx'
import type { JsonSchema } from './spec.ts'
import { referenceOf } from './reference-value.ts'

const TIMING = { sortableLoadTimeoutMs: 10_000, testTimeoutMs: 20_000 } as const

const post = defineCollection({
  name: 'post',
  label: 'title',
  schema: z.object({ title: localized(z.string()) })
})

const schema = z.toJSONSchema(z.object({ posts: entries(post, { max: 4 }) }), {
  io: 'input'
}) as JsonSchema

const summary = (id: string, title: string, published: boolean) => ({
  id,
  collection: 'post',
  version: 1,
  schemaVersion: 1,
  label: { en: title },
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
  publishedAt: published ? 2 : null,
  publishedVersion: published ? 1 : null,
  publishedBy: null
})

const listing = {
  entries: [summary('a', 'Alpha', true), summary('b', 'Beta', true), summary('c', 'Gamma', false)]
}

function setup(posts: unknown) {
  const onChange = vi.fn()
  const user = userEvent.setup({ delay: null })
  render(
    <QueryClientProvider client={testQueryClient()}>
      <BlockForm schema={schema} locales={['en']} value={{ posts } as never} onChange={onChange} />
    </QueryClientProvider>
  )
  return { user, onChange }
}

const lastValue = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.calls.at(-1)?.[0] as { posts: unknown }).posts

describe('the entry reference field', { timeout: TIMING.testTimeoutMs }, () => {
  beforeAll(() => import('@/components/sortable-items'))
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(listing), { status: 200 }))
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('lists the chosen entries by label and marks one that is not published', async () => {
    setup({ mode: 'chosen', ids: ['c', 'a'] })
    expect(await screen.findByText('Gamma')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Not published')).toBeInTheDocument()
    expect(
      await screen.findByRole(
        'button',
        { name: 'Reorder Gamma' },
        { timeout: TIMING.sortableLoadTimeoutMs }
      )
    ).toBeInTheDocument()
  })

  it('adds an entry found by searching, and removes one', async () => {
    const { user, onChange } = setup({ mode: 'chosen', ids: ['a'] })
    await screen.findByText('Alpha')
    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(await screen.findByRole('combobox', { name: 'Search entries' }), 'bet')
    expect(screen.queryByRole('option', { name: /Alpha/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: /Beta/ }))
    await waitFor(() => expect(lastValue(onChange)).toEqual({ mode: 'chosen', ids: ['a', 'b'] }))
    await user.click(screen.getByRole('button', { name: 'Remove Alpha' }))
    await waitFor(() => expect(lastValue(onChange)).toEqual({ mode: 'chosen', ids: ['b'] }))
  })

  it('switches to the latest entries with a count within the limit', async () => {
    const { user, onChange } = setup({ mode: 'chosen', ids: ['a'] })
    await user.click(screen.getByRole('tab', { name: 'Latest entries' }))
    await waitFor(() => expect(lastValue(onChange)).toEqual({ mode: 'latest', count: 3 }))
    const count = screen.getByRole('textbox', { name: 'How many' })
    await user.clear(count)
    await user.type(count, '9')
    await user.tab()
    await waitFor(() => expect(lastValue(onChange)).toEqual({ mode: 'latest', count: 4 }))
  })
})

describe('referenceOf', () => {
  it('reads either mode and falls back to an empty choice', () => {
    expect(referenceOf({ mode: 'latest', count: 2 })).toEqual({ mode: 'latest', count: 2 })
    expect(referenceOf({ mode: 'chosen', ids: ['a', 1] })).toEqual({ mode: 'chosen', ids: ['a'] })
    expect(referenceOf(undefined)).toEqual({ mode: 'chosen', ids: [] })
  })
})
