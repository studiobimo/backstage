import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderShell, resetShell, stubApi } from '@/test/shell'

describe('app shell navigation', () => {
  afterEach(resetShell)

  it('has a sidebar with the navigation, a theme toggle and a language switcher', async () => {
    await renderShell()
    expect(screen.getByRole('link', { name: /Backstage/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: /theme/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('names the current page in the breadcrumb', async () => {
    await renderShell('/type')
    expect(
      screen.getByText('Type specimen', { selector: '[aria-current="page"]' })
    ).toBeInTheDocument()
  })

  it('names the page being edited under its section in the breadcrumb', async () => {
    stubApi()
    await renderShell('/pages/p1')
    const breadcrumb = await screen.findByRole('navigation', { name: 'breadcrumb' })
    expect(await within(breadcrumb).findByRole('link', { name: 'Pages' })).toHaveAttribute(
      'href',
      '/pages'
    )
    expect(
      await screen.findByText('About', { selector: '[aria-current="page"]' })
    ).toBeInTheDocument()
  })

  it('links each single-item section straight to its screen', async () => {
    await renderShell()
    expect(screen.getByRole('link', { name: 'Pages' })).toHaveAttribute('href', '/pages')
    expect(screen.getByRole('link', { name: 'Media' })).toHaveAttribute('href', '/media')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.queryByRole('button', { name: 'Pages' })).not.toBeInTheDocument()
  })

  it('has no Home item in the navigation, because the logo goes home', async () => {
    await renderShell()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('does not repeat the product name in the breadcrumb', async () => {
    await renderShell('/type')
    const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' })
    expect(breadcrumb).not.toHaveTextContent('Backstage')
  })

  it('shows the type specimen link while developing', async () => {
    await renderShell()
    expect(screen.getByRole('link', { name: 'Type specimen' })).toHaveAttribute('href', '/type')
  })

  it('hides the type specimen link outside development', async () => {
    vi.stubEnv('DEV', false)
    await renderShell()
    expect(screen.queryByRole('link', { name: 'Type specimen' })).not.toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
