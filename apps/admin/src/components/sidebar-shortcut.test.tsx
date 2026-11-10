import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { renderShell, resetShell, stubApi } from '@/test/shell'

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
