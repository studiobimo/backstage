import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { renderShell, resetShell, stubApi } from '@/test/shell'

describe('command palette', () => {
  beforeEach(stubApi)
  afterEach(resetShell)

  it('opens from the keyboard and from the header button, and closes with Escape', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByPlaceholderText('Search pages and actions…')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Search pages and actions…')).toBeNull()
    )
    await user.click(screen.getByRole('button', { name: /Search/ }))
    expect(await screen.findByPlaceholderText('Search pages and actions…')).toBeInTheDocument()
  })

  it('finds a page by title from the pages query and opens its editor', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('About')
    await user.click(await screen.findByRole('option', { name: /About/ }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search pages and actions…')).toBeNull()
  })

  it('runs an action and switches the theme', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.keyboard('{Control>}k{/Control}')
    await user.click(await screen.findByRole('option', { name: 'Theme: Dark' }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('opens the new page form from the New page action', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.keyboard('{Control>}k{/Control}')
    await user.click(await screen.findByRole('option', { name: 'New page' }))
    expect(await screen.findByRole('button', { name: 'Create page' })).toBeInTheDocument()
  })
})

describe('sidebar shortcut', () => {
  beforeEach(stubApi)
  afterEach(resetShell)

  it('toggles the sidebar from the shortcut registry', async () => {
    await renderShell()
    const user = userEvent.setup()
    const sidebar = () => document.querySelector('[data-slot="sidebar"][data-state]')
    const before = sidebar()?.getAttribute('data-state')
    await user.keyboard('{Control>}b{/Control}')
    expect(sidebar()?.getAttribute('data-state')).not.toBe(before)
    expect(screen.getByRole('button', { name: 'Toggle the sidebar' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+B Meta+B'
    )
  })
})
