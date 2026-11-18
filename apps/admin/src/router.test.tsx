import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from './i18n/config'
import { createAppRouter } from './router'
import { testQueryClient } from './test/query-client'
import { stubApi } from './test/shell'

afterEach(() => vi.unstubAllGlobals())

describe('router', () => {
  it('renders the home page at /', async () => {
    stubApi()
    const queryClient = testQueryClient()
    const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: ['/'] }))
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('gives every route a title that exists in the catalogs', () => {
    const router = createAppRouter(testQueryClient())
    const routes = Object.values(router.routesByPath)
    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      const title = route.options.staticData?.title
      expect(title, `${route.fullPath} declares no title`).toBeTruthy()
      for (const language of ['en', 'es']) {
        expect(
          i18n.exists(title as string, { lng: language }),
          `${route.fullPath} in ${language}`
        ).toBe(true)
      }
    }
  })
})
