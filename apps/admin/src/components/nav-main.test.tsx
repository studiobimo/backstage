import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileText } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'
import { NavSection } from '@/components/nav-main'
import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar'

const twoItems = {
  key: 'pages',
  icon: FileText,
  path: '/pages' as const,
  items: [
    { key: 'all', path: '/pages' as const },
    { key: 'drafts', path: '/pages' as const }
  ]
}

async function renderSection() {
  i18n.addResource('en', 'common', 'nav.sections.pages.items.drafts', 'Drafts')
  const root = createRootRoute({
    component: () => (
      <SidebarProvider>
        <SidebarMenu>
          <NavSection section={twoItems} pathname="/" />
        </SidebarMenu>
      </SidebarProvider>
    )
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('button', { name: 'Pages' })
}

describe('nav section', () => {
  it('expands to its items once it has more than one', async () => {
    await renderSection()
    const user = userEvent.setup()
    expect(screen.queryByRole('link', { name: 'All pages' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pages' }))
    expect(await screen.findByRole('link', { name: 'All pages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Drafts' })).toBeInTheDocument()
  })
})
