import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import { mockInboxApi, renderInbox, reservation, reservationForm } from './forms-test-support'
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

const api = (submissions: unknown[]) =>
  mockInboxApi({
    '/submissions': () => ({ submissions }),
    '/forms': () => ({ forms: [reservationForm] })
  })

const renderNewOnly = (onFilterChange: () => void) =>
  renderInbox(
    <SubmissionsPage
      name="reservation"
      filter={{ status: 'new' }}
      onFilterChange={onFilterChange}
    />
  )

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

  it('labels the columns in the admin language', async () => {
    await i18n.changeLanguage('es')
    api([reservation])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    expect(await screen.findByRole('columnheader', { name: 'Comensales' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Fecha' })).toBeInTheDocument()
  })

  it('asks the api for the filter it is given', async () => {
    const calls = api([])
    renderInbox(
      <SubmissionsPage
        name="reservation"
        filter={{ status: 'new', from: '2026-12-01' }}
        onFilterChange={vi.fn()}
      />
    )
    await screen.findByText('No submissions match')
    expect(calls.some(({ url }) => url.endsWith('/submissions?status=new&from=2026-12-01'))).toBe(
      true
    )
  })

  it('reports a changed date and clears the filters', async () => {
    api([])
    const onFilterChange = vi.fn()
    const user = userEvent.setup()
    renderNewOnly(onFilterChange)
    const from = await screen.findByLabelText('Date from')
    await user.type(from, '2026-12-24')
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith({ status: 'new', from: '2026-12-24' })
    )
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!)
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })

  it('offers to clear the filters from the no-match state', async () => {
    api([])
    const onFilterChange = vi.fn()
    const user = userEvent.setup()
    renderNewOnly(onFilterChange)
    await screen.findByText('No submissions match')
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!)
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })

  it('says so when nothing has arrived', async () => {
    api([])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    expect(await screen.findByText('Nothing received yet')).toBeInTheDocument()
  })

  it('does not offer a date filter for a form without a date field', async () => {
    mockInboxApi({
      '/submissions': () => ({ submissions: [] }),
      '/forms': () => ({ forms: [{ ...reservationForm, dateField: null }] })
    })
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    await screen.findByText('Nothing received yet')
    expect(screen.queryByLabelText('Date from')).toBeNull()
  })
})
