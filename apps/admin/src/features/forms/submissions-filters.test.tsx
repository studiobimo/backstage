import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  inboxApi as api,
  listingOf,
  mockInboxApi,
  renderInbox,
  reservationForm
} from './forms-test-support'
import { SubmissionsPage } from './submissions-page'

afterEach(() => vi.unstubAllGlobals())

const renderNewOnly = (onFilterChange: () => void) =>
  renderInbox(
    <SubmissionsPage
      name="reservation"
      filter={{ status: 'new' }}
      onFilterChange={onFilterChange}
    />
  )

describe('the filters of the submissions', () => {
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
    expect(
      calls.some(({ url }) => url.endsWith('/submissions?status=new&from=2026-12-01&language=en'))
    ).toBe(true)
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
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onFilterChange).toHaveBeenLastCalledWith({})
  })

  it('does not offer a date filter for a form without a date field', async () => {
    mockInboxApi({
      '/submissions': () => listingOf([]),
      '/forms': () => ({ forms: [{ ...reservationForm, dateField: null }] })
    })
    renderInbox(<SubmissionsPage name="reservation" filter={{}} onFilterChange={vi.fn()} />)
    await screen.findByText('Nothing received yet')
    expect(screen.queryByLabelText('Date from')).toBeNull()
  })

  it('goes back to the first page when a filter changes', async () => {
    api([], { page: 3 })
    const onFilterChange = vi.fn()
    const user = userEvent.setup()
    renderInbox(
      <SubmissionsPage
        name="reservation"
        filter={{ status: 'new', page: 3 }}
        onFilterChange={onFilterChange}
      />
    )
    await user.type(await screen.findByLabelText('Date from'), '2026-12-24')
    await waitFor(() => expect(onFilterChange).toHaveBeenCalled())
    expect(onFilterChange.mock.calls.at(-1)?.[0]).toMatchObject({ status: 'new' })
    expect(onFilterChange.mock.calls.at(-1)?.[0].page).toBeUndefined()
  })
})
