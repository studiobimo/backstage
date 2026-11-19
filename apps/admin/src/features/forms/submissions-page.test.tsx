import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockInboxApi, renderInbox, reservation, reservationForm } from './forms-test-support'
import { SubmissionsPage } from './submissions-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="/forms/reservation/s1" className={className}>
      {children}
    </a>
  )
}))

afterEach(() => vi.unstubAllGlobals())

const api = (submissions: unknown[]) =>
  mockInboxApi({
    '/submissions': () => ({ submissions }),
    '/forms': () => ({ forms: [reservationForm] })
  })

describe('SubmissionsPage', () => {
  it('lists submissions with a summary and the status', async () => {
    api([reservation])
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link')).toHaveTextContent(
      '4 · Dec 24, 2026 · 20:30 · Ana Pérez'
    )
    expect(within(table).getByText('New')).toBeInTheDocument()
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
    renderInbox(
      <SubmissionsPage
        name="reservation"
        filter={{ status: 'new' }}
        onFilterChange={onFilterChange}
      />
    )
    const from = await screen.findByLabelText('Date from')
    await user.type(from, '2026-12-24')
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith({ status: 'new', from: '2026-12-24' })
    )
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
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
