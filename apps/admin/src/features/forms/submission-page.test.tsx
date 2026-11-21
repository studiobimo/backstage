import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import {
  mockInboxApi,
  reservationFields,
  renderInbox,
  reservation,
  reservationForm
} from './forms-test-support'
import { SubmissionPage } from './submission-page'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a href="/forms/reservation" className={className}>
      {children}
    </a>
  )
}))

afterEach(async () => {
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
})

const api = () =>
  mockInboxApi({
    '/status': () => ({
      submission: { ...reservation, status: 'confirmed', updatedBy: 'Ada Lovelace' }
    }),
    '/anonymise': () => ({ submission: { ...reservation, payload: {}, tokenActive: false } }),
    '/revoke-token': () => ({ submission: { ...reservation, tokenActive: false } }),
    '/submissions/s1': () => ({ submission: reservation, fields: reservationFields }),
    '/forms': () => ({ forms: [reservationForm] })
  })

describe('SubmissionPage', () => {
  it('shows each presented field, and a list of objects as a table with its total', async () => {
    api()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Seats')).toBeInTheDocument()
    expect(screen.getByText('Dec 24, 2026')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Preorder' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual(['Dish', 'Price', 'Quantity'])
    expect(within(table).getByText('Paella')).toBeInTheDocument()
    expect(within(table).getByText('$5.00')).toBeInTheDocument()
    expect(within(table).getByText('Total')).toBeInTheDocument()
    expect(within(table).getByText('$17.50')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Reservation/ })).toBeInTheDocument()
  })

  it('offers the other statuses and changes the status', async () => {
    const calls = api()
    const user = userEvent.setup()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    await user.click(await screen.findByRole('button', { name: 'Mark as confirmed' }))
    await waitFor(() =>
      expect(
        calls.some(({ method, url }) => method === 'PUT' && url.endsWith('/submissions/s1/status'))
      ).toBe(true)
    )
    expect(await screen.findByText(/Last changed by Ada Lovelace/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as confirmed' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Mark as new' })).toBeInTheDocument()
  })

  it('revokes the status link after confirming, then disables the action', async () => {
    const calls = api()
    const user = userEvent.setup()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    await user.click(await screen.findByRole('button', { name: 'Revoke status link' }))
    await user.click(await screen.findByRole('button', { name: 'Revoke link' }))
    await waitFor(() =>
      expect(
        calls.some(({ method, url }) => method === 'POST' && url.endsWith('/s1/revoke-token'))
      ).toBe(true)
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Revoke status link' })).toBeDisabled()
    )
  })

  it('anonymises only after the confirmation', async () => {
    const calls = api()
    const user = userEvent.setup()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    await user.click(await screen.findByRole('button', { name: 'Anonymise' }))
    expect(calls.some(({ url }) => url.endsWith('/anonymise'))).toBe(false)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(calls.some(({ url }) => url.endsWith('/anonymise'))).toBe(false)
    await user.click(await screen.findByRole('button', { name: 'Anonymise' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Anonymise' })
    )
    await waitFor(() => expect(calls.some(({ url }) => url.endsWith('/anonymise'))).toBe(true))
  })

  it('deletes after confirming and returns to the inbox', async () => {
    const calls = api()
    const user = userEvent.setup()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete submission' }))
    await waitFor(() =>
      expect(calls.some(({ method, url }) => method === 'DELETE' && url.endsWith('/s1'))).toBe(true)
    )
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })

  it('reads in Spanish and asks the api for Spanish labels', async () => {
    await i18n.changeLanguage('es')
    const calls = api()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    expect(await screen.findByRole('button', { name: 'Marcar como rechazada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver a Reserva/ })).toBeInTheDocument()
    expect(calls.some(({ url }) => url.endsWith('/submissions/s1?language=es'))).toBe(true)
  })
})
