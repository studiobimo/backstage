import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderShell, resetShell } from '@/test/shell'

const stubAuthApi = (verifyStatus = 204) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('/verify') && verifyStatus !== 204) {
      return Response.json({ error: 'Bad link', code: 'invalid_login_link' }, { status: 400 })
    }
    if (url.includes('/api/auth/')) return new Response(null, { status: verifyStatus })
    return Response.json({ authenticated: true, mode: 'magic-link' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('sign-in page', () => {
  afterEach(resetShell)

  it('asks for an email and then tells the person to check it', async () => {
    const fetchMock = stubAuthApi(202)
    await renderShell('/sign-in')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), ' Editor@Studio.test ')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/editor@studio\.test/)).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/auth/request-link')
    expect(JSON.parse(String(init.body))).toEqual({ email: 'editor@studio.test' })
  })

  it('refuses an address that is not an email without calling the server', async () => {
    const fetchMock = stubAuthApi(202)
    await renderShell('/sign-in')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns to the form to use another address', async () => {
    stubAuthApi(202)
    await renderShell('/sign-in')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'editor@studio.test')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    await user.click(await screen.findByRole('button', { name: 'Use a different email' }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('consumes a link only when the person confirms', async () => {
    const fetchMock = stubAuthApi()
    await renderShell('/sign-in?token=abc123')
    expect(fetchMock).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue to the admin' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/auth/verify')
    expect(JSON.parse(String(init.body))).toEqual({ token: 'abc123' })
  })

  it('says so when the link no longer works', async () => {
    stubAuthApi(400)
    await renderShell('/sign-in?token=stale')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue to the admin' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Request a new link' }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })
})
