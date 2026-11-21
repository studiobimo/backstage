import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFreshPagesDb } from './pages-test-support'
import {
  answerTurnstile,
  entrypointWith,
  reservation,
  storedSubmissions,
  TURNSTILE_TOKEN,
  VISITOR,
  email,
  OWNER,
  SENDER
} from './forms-test-support'

const submitWith = (overrides: Parameters<typeof entrypointWith>[0] = {}) =>
  entrypointWith(overrides).submit(VISITOR, 'reservation', reservation, TURNSTILE_TOKEN)

describe('notifying the owners of a submission', () => {
  useFreshPagesDb()
  beforeEach(() => {
    answerTurnstile(true)
    email.send.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('emails each owner through the EMAIL binding', async () => {
    const result = await submitWith({ OWNER_EMAIL: `${OWNER}, second@example.com` })
    expect(email.send).toHaveBeenCalledTimes(2)
    expect(email.send).toHaveBeenCalledWith({
      to: OWNER,
      from: SENDER,
      subject: 'Table for 4 on 2026-12-24',
      text: expect.stringContaining(`Reference: ${(result as { id: string }).id}`),
      html: expect.stringContaining('<dl>')
    })
  })

  it('sends nothing when no owner is configured', async () => {
    expect(await submitWith({ OWNER_EMAIL: '' })).toMatchObject({ ok: true })
    expect(email.send).not.toHaveBeenCalled()
  })

  it('keeps the submission when the email cannot be sent', async () => {
    email.send.mockRejectedValueOnce(new Error('mail down'))
    expect(await submitWith()).toMatchObject({ ok: true })
    expect(await storedSubmissions()).toHaveLength(1)
  })

  it('keeps the submission when the EMAIL binding is missing', async () => {
    expect(await submitWith({ EMAIL: undefined })).toMatchObject({ ok: true })
    expect(await storedSubmissions()).toHaveLength(1)
  })

  it('does not email for a refused submission', async () => {
    await entrypointWith().submit(
      VISITOR,
      'reservation',
      { ...reservation, seats: 0 },
      TURNSTILE_TOKEN
    )
    expect(email.send).not.toHaveBeenCalled()
  })
})
