import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { previewUrl } from '@/lib/preview-url'
import { testQueryClient } from '@/test/query-client'

import { BlockPreviewPage } from './block-preview-page'

const SITE = 'https://site.test'

const BLOCKS = [
  { name: 'split-hero', version: 1, schema: {}, title: { en: 'Split Hero', es: 'Hero dividido' } },
  { name: 'one-column-text', version: 1, schema: {} }
]

function renderPage(queryClient = testQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BlockPreviewPage />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(url.endsWith('/site-origin') ? { origin: SITE } : { blocks: BLOCKS })
        )
    )
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BlockPreviewPage', () => {
  it('builds the frame url from the site origin, block and locale', () => {
    expect(previewUrl(SITE, 'split-hero', 'es')).toBe(
      `${SITE}/__preview/blocks/split-hero?locale=es`
    )
  })

  it('frames every block from the registry on the site', async () => {
    renderPage()
    const frame = await screen.findByTitle('Split Hero preview')
    expect(frame).toHaveAttribute('src', previewUrl(SITE, 'split-hero', 'en'))
    expect(screen.getByTitle('one-column-text preview')).toHaveAttribute(
      'src',
      previewUrl(SITE, 'one-column-text', 'en')
    )
  })

  it('offers no language choice on a site with one language', async () => {
    renderPage(testQueryClient({ locales: ['fr'], defaultLocale: 'fr' }))
    expect(await screen.findByTitle('split-hero preview')).toHaveAttribute(
      'src',
      previewUrl(SITE, 'split-hero', 'fr')
    )
    expect(screen.queryByRole('button', { name: 'FR' })).toBeNull()
  })

  it('reframes in the chosen language and marks the chosen width', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByTitle('Split Hero preview')
    await user.click(screen.getByRole('button', { name: 'ES' }))
    expect(await screen.findByTitle('Hero dividido preview')).toHaveAttribute(
      'src',
      previewUrl(SITE, 'split-hero', 'es')
    )
    await user.click(screen.getByRole('button', { name: 'Phone' }))
    expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true')
  })
})
