import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'

import { testQueryClient } from '@/test/query-client'

import { BlockForm } from './block-form.tsx'
import type { JsonSchema } from './spec.ts'

export function renderField(schema: JsonSchema, field: string, value: unknown) {
  const onChange = vi.fn()
  const user = userEvent.setup({ delay: null })
  render(
    <QueryClientProvider client={testQueryClient()}>
      <BlockForm
        schema={schema}
        locales={['en']}
        value={{ [field]: value } as never}
        onChange={onChange}
      />
    </QueryClientProvider>
  )
  return { user, onChange }
}

export const lastFieldValue = (onChange: ReturnType<typeof vi.fn>, field: string) =>
  (onChange.mock.calls.at(-1)?.[0] as Record<string, unknown>)[field]

export function useStubbedListing(listing: unknown) {
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
}
