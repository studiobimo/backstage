import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n/config'
import { createAppRouter } from '@/router'

async function renderShell() {
  const queryClient = new QueryClient()
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: ['/'] }))
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('heading', { level: 1 })
}

describe('app shell', () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('has a sidebar with the navigation, a theme toggle and a language switcher', async () => {
    await renderShell()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: /theme/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows its strings in Spanish when the language changes', async () => {
    await renderShell()
    await i18n.changeLanguage('es')
    expect(await screen.findByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches the language from the switcher', async () => {
    await renderShell()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Language' }))
    await user.click(await screen.findByRole('option', { name: 'Español' }))
    expect(await screen.findByRole('link', { name: 'Inicio' })).toBeInTheDocument()
  })
})
