import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'
import { renderShell, resetShell } from '@/test/shell'

describe('app shell preferences', () => {
  afterEach(resetShell)

  it('shows its strings in Spanish when the language changes', async () => {
    await renderShell()
    await i18n.changeLanguage('es')
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches the language from the switcher', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Language' }))
    await user.click(await screen.findByRole('option', { name: 'Español' }))
    expect(await screen.findByRole('link', { name: 'Páginas' })).toBeInTheDocument()
  })
})
