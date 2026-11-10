import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'
import { renderShell, resetShell, stubApi } from '@/test/shell'

describe('user menu', () => {
  afterEach(resetShell)

  it('shows its strings in Spanish when the language changes', async () => {
    await renderShell()
    await i18n.changeLanguage('es')
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches the language from the user menu', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Editor' }))
    expect(await screen.findByRole('menuitemradio', { name: 'English' })).toBeChecked()
    await user.click(screen.getByRole('menuitemradio', { name: 'Español' }))
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
  })

  it('switches the theme from the user menu and follows the system on request', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Editor' }))
    expect(await screen.findByRole('menuitemradio', { name: 'System' })).toBeChecked()
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    await user.click(screen.getByRole('menuitemradio', { name: 'Light' }))
    expect(document.documentElement).not.toHaveClass('dark')
    await user.click(screen.getByRole('menuitemradio', { name: 'System' }))
    expect(localStorage.getItem('theme')).toBeNull()
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
    await user.click(screen.getByRole('button', { name: 'Editor' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Español' }))
    const translated = await screen.findByRole('tablist', { name: 'Idioma de edición' })
    expect(within(translated).getByRole('tab', { name: /español/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
