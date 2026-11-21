import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderInbox } from './forms-test-support'
import { SubmissionsPager } from './submissions-pager'

const PAGE_SIZE = 25

const renderPager = (page: number, total: number, onPageChange = vi.fn()) => {
  renderInbox(
    <SubmissionsPager listing={{ page, pageSize: PAGE_SIZE, total }} onPageChange={onPageChange} />
  )
  return onPageChange
}

describe('the pager of the submissions', () => {
  it('says where it is and moves to the next and previous page', async () => {
    const onPageChange = renderPager(2, 60)
    const user = userEvent.setup()
    const pager = await screen.findByRole('navigation', { name: 'Pages of submissions' })
    expect(within(pager).getByText(/26–50 of 60 · Page 2 of 3/)).toBeInTheDocument()
    await user.click(within(pager).getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
    await user.click(within(pager).getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
  })

  it('cannot go before the first or after the last page', async () => {
    renderPager(1, 30)
    expect(await screen.findByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('is not shown when everything fits on one page', () => {
    renderPager(1, PAGE_SIZE)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
