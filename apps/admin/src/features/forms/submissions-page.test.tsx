import { screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import { inboxApi as api, renderInbox, reservation } from './forms-test-support'
import { SubmissionsPage } from './submissions-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="/forms/reservation/s1" className={className}>
      {children}
    </a>
  )
}))

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
})

describe('SubmissionsPage', () => {
  it('shows a column for each key field with its label, and the status', async () => {
    api([reservation])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual(['Date', 'Name', 'Time', 'Seats', 'Received', 'Status'])
    expect(within(table).getByRole('link')).toHaveTextContent('Dec 24, 2026')
    expect(within(table).getByText('Ana Pérez')).toBeInTheDocument()
    expect(within(table).getByText('20:30')).toBeInTheDocument()
    expect(within(table).getByText('New')).toBeInTheDocument()
  })

  it('keeps the first two columns and the status on a narrow screen', async () => {
    api([reservation])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    const table = await screen.findByRole('table')
    const [date, name, time, seats, received, status] = within(table).getAllByRole('columnheader')
    for (const kept of [date, name, status]) expect(kept?.className).not.toMatch(/hidden/)
    for (const dropped of [time, seats, received]) expect(dropped).toHaveClass('hidden')
  })

  it('asks for the columns in the admin language', async () => {
    await i18n.changeLanguage('es')
    const calls = api([reservation])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    await screen.findByRole('table')
    expect(calls.some(({ url }) => url.includes('language=es'))).toBe(true)
  })

  it('says so when nothing has arrived', async () => {
    api([])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    expect(await screen.findByText('Nothing received yet')).toBeInTheDocument()
  })
})
