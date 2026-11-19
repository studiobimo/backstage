import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFreshPagesDb } from './pages-test-support'
import {
  answerTurnstile,
  entrypointWith,
  reservation,
  storedSubmissions,
  submit,
  TURNSTILE_TOKEN,
  VISITOR
} from './forms-test-support'

describe('the Turnstile check on a submission', () => {
  useFreshPagesDb()
  afterEach(() => vi.unstubAllGlobals())

  it('refuses a token Turnstile rejects, without storing anything', async () => {
    answerTurnstile(false)
    expect(await submit(reservation, 'bad-token')).toMatchObject({
      ok: false,
      code: 'turnstile_failed'
    })
    expect(await storedSubmissions()).toEqual([])
  })

  it('refuses a submission with no token', async () => {
    answerTurnstile(true)
    expect(await submit(reservation, null)).toMatchObject({ ok: false, code: 'turnstile_failed' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses every submission when the secret is not configured', async () => {
    answerTurnstile(true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await entrypointWith({ TURNSTILE_SECRET: undefined }).submit(
      VISITOR,
      'reservation',
      reservation,
      TURNSTILE_TOKEN
    )
    expect(result).toMatchObject({ ok: false, code: 'turnstile_failed' })
    expect(await storedSubmissions()).toEqual([])
  })
})
