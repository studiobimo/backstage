import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'
import i18n from '@/i18n/config'
import { postsCollection } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'

import { NavCollections } from './nav-collections'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    ...props
  }: {
    children: ReactNode
    params: { name: string }
    to: string
  }) => (
    <a href={`/collections/${params.name}`} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: '/collections/posts/e1' } })
}))

const mockCollections = (collections: unknown[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ collections })))
  )

const renderNav = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <SidebarProvider>
        <NavCollections />
      </SidebarProvider>
    </QueryClientProvider>
  )

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
})

describe('NavCollections', () => {
  it('links to each collection by its title in the editor language and marks the open one', async () => {
    mockCollections([postsCollection, { ...postsCollection, name: 'team', title: undefined }])
    renderNav()
    const posts = await screen.findByRole('link', { name: 'Posts' })
    expect(posts).toHaveAttribute('href', '/collections/posts')
    expect(posts).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('link', { name: 'team' })).not.toHaveAttribute('data-active', 'true')
  })

  it('titles a collection in Spanish when the editor uses it', async () => {
    await i18n.changeLanguage('es')
    mockCollections([postsCollection])
    renderNav()
    expect(await screen.findByRole('link', { name: 'Artículos' })).toBeInTheDocument()
  })

  it('shows nothing when the site has no collections', async () => {
    mockCollections([])
    renderNav()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByText('Collections')).toBeNull()
  })
})
