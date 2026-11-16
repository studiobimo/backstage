import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import i18n from '@/i18n/config'
import { createAppRouter } from '@/router'
import { aboutPage } from '@/test/fixtures'
import { DEFAULT_TEST_CONFIG, testQueryClient } from '@/test/query-client'

const apiBodies: Record<string, unknown> = {
  '/api/auth/session': { mode: 'access', authenticated: true },
  '/api/v1/config': DEFAULT_TEST_CONFIG,
  '/api/v1/pages': { pages: [aboutPage] },
  '/api/v1/pages/p1/blocks': { blocks: [], layout: 'default', version: 1 },
  '/api/v1/pages/p1/seo': {
    seo: {
      en: { title: '', description: '', socialImageId: null },
      es: { title: '', description: '', socialImageId: null }
    },
    version: 1
  },
  '/api/v1/settings': { settings: { siteName: { en: 'Studio' } }, version: 1 },
  '/api/v1/blocks': { blocks: [] },
  '/api/v1/site-origin': { origin: 'https://site.test' },
  '/api/v1/layouts': { layouts: ['default'] }
}

export function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(apiBodies[new URL(url, 'http://x').pathname]))
    )
  )
}

export async function renderShell(path = '/') {
  const queryClient = testQueryClient()
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('heading', { level: 1 })
}

export function resetShell() {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  vi.unstubAllGlobals()
  return i18n.changeLanguage('en')
}
