import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ariaKeyShortcuts, shortcutKeys, shouldHandleShortcut } from '@/lib/shortcuts'
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

const press = (init: KeyboardEventInit, target?: Element) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('shortcuts', () => {
  it('describes a modified shortcut for assistive technology', () => {
    expect(ariaKeyShortcuts('save')).toBe('Control+S Meta+S')
    expect(ariaKeyShortcuts('newPage')).toBe('N')
    expect(shortcutKeys('newPage')).toEqual(['N'])
  })

  it('handles Save with a modifier, even inside a text field', () => {
    const field = document.createElement('input')
    expect(shouldHandleShortcut(press({ key: 's', ctrlKey: true }, field), 'save')).toBe(true)
    expect(shouldHandleShortcut(press({ key: 's' }), 'save')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 's', ctrlKey: true, shiftKey: true }), 'save')).toBe(
      false
    )
  })

  it('skips a bare shortcut while typing or while a dialog is open', () => {
    const field = document.createElement('textarea')
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    expect(shouldHandleShortcut(press({ key: 'n' }), 'newPage')).toBe(true)
    expect(shouldHandleShortcut(press({ key: 'n' }, field), 'newPage')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 'n' }, editor), 'newPage')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 'n', metaKey: true }), 'newPage')).toBe(false)
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog" id="d"></div>')
    expect(shouldHandleShortcut(press({ key: 'n' }), 'newPage')).toBe(false)
    document.getElementById('d')?.remove()
  })
})
