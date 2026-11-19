import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import {
  mockInboxApi,
  paellaEntries,
  renderInbox,
  reservation,
  reservationForm
} from './forms-test-support'
import { SubmissionPage } from './submission-page'

vi.mock('@tanstack/react-router', () => ({
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
    '/submissions/s1': () => ({ submission: reservation, entries: paellaEntries }),
    '/forms': () => ({ forms: [reservationForm] })
  })

describe('SubmissionPage', () => {
  it('shows each field of the schema and the title of a referenced entry', async () => {
    api()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Seats')).toBeInTheDocument()
    expect(screen.getByText('Paella')).toBeInTheDocument()
    expect(screen.getByText(/Thursday, December 24, 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Reservation/ })).toBeInTheDocument()
  })

  it('offers the other statuses and changes the status', async () => {
    const calls = api()
    const user = userEvent.setup()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    await user.click(await screen.findByRole('button', { name: 'Mark as Confirmed' }))
    await waitFor(() =>
      expect(
        calls.some(({ method, url }) => method === 'PUT' && url.endsWith('/submissions/s1/status'))
      ).toBe(true)
    )
    expect(await screen.findByText(/Last changed by Ada Lovelace/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as Confirmed' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Mark as New' })).toBeInTheDocument()
  })

  it('reads in Spanish', async () => {
    await i18n.changeLanguage('es')
    api()
    renderInbox(<SubmissionPage name="reservation" submissionId="s1" />)
    expect(await screen.findByRole('button', { name: 'Marcar como Rechazada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver a Reserva/ })).toBeInTheDocument()
  })
})
