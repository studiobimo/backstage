import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'
import { reservationForm } from '@/features/forms/forms-test-support'
import i18n from '@/i18n/config'
import { testQueryClient } from '@/test/query-client'

import { NavForms } from './nav-forms'

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
    <a href={`/forms/${params.name}`} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: '/forms/reservation/s1' } })
}))

const mockForms = (forms: unknown[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ forms })))
  )

const renderNav = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <SidebarProvider>
        <NavForms />
      </SidebarProvider>
    </QueryClientProvider>
  )

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
})

describe('NavForms', () => {
  it('links to each form with its count of new submissions and marks the open one', async () => {
    mockForms([reservationForm])
    renderNav()
    const link = await screen.findByRole('link', { name: 'Reservation' })
    expect(link).toHaveAttribute('href', '/forms/reservation')
    expect(link).toHaveAttribute('data-active', 'true')
    expect(screen.getByLabelText('2 new')).toHaveTextContent('2')
  })

  it('shows no count when nothing is new', async () => {
    mockForms([{ ...reservationForm, newCount: 0 }])
    renderNav()
    await screen.findByRole('link', { name: 'Reservation' })
    expect(screen.queryByLabelText(/new/)).toBeNull()
  })

  it('titles a form in Spanish when the editor uses it', async () => {
    await i18n.changeLanguage('es')
    mockForms([reservationForm])
    renderNav()
    expect(await screen.findByRole('link', { name: 'Reserva' })).toBeInTheDocument()
    expect(screen.getByLabelText('2 nuevas')).toBeInTheDocument()
  })

  it('shows nothing when the site has no forms', async () => {
    mockForms([])
    renderNav()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByText('Forms')).toBeNull()
  })
})
