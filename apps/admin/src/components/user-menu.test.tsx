import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'
import { renderShell, resetShell, stubApi } from '@/test/shell'

async function openSubmenu(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  const item = await screen.findByRole('menuitem', { name })
  item.focus()
  await user.keyboard('{ArrowRight}')
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: string) {
  const radio = await screen.findByRole('menuitemradio', { name })
  radio.focus()
  await user.keyboard('{Enter}')
}

describe('user menu', () => {
  afterEach(resetShell)

  it('shows its strings in Spanish when the language changes', async () => {
    await renderShell()
    await i18n.changeLanguage('es')
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches the language from the user menu', async () => {
    stubApi()
    await renderShell()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    await openSubmenu(user, /Language/)
    expect(await screen.findByRole('menuitemradio', { name: 'English' })).toBeChecked()
    await choose(user, 'Español')
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
  })

  it('switches the theme from the user menu and follows the system on request', async () => {
    stubApi()
    await renderShell()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    await openSubmenu(user, /Theme/)
    expect(await screen.findByRole('menuitemradio', { name: 'System' })).toBeChecked()
    await choose(user, 'Dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('shows the signed-in name and email and offers sign out', async () => {
    stubApi()
    await renderShell()
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: /Ada Lovelace/ })
    expect(trigger).toHaveTextContent('ada@studio.test')
    await user.click(trigger)
    expect(await screen.findByRole('menuitem', { name: 'Sign out' })).toBeEnabled()
    expect(screen.queryByRole('menuitem', { name: /Notifications/ })).not.toBeInTheDocument()
  })

  it('keeps the language being edited when the admin language changes', async () => {
    stubApi()
    await renderShell('/pages/p1')
    const user = userEvent.setup()
    const editing = await screen.findByRole('tablist', { name: 'Editing language' })
    await user.click(within(editing).getByRole('tab', { name: /spanish/i }))
    expect(within(editing).getByRole('tab', { name: /spanish/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    await openSubmenu(user, /Language/)
    await choose(user, 'Español')
    const translated = await screen.findByRole('tablist', { name: 'Idioma de edición' })
    expect(within(translated).getByRole('tab', { name: /español/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
