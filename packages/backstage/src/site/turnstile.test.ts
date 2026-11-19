import { afterEach, describe, expect, it, vi } from 'vitest'

import { TURNSTILE, verifyTurnstile } from './turnstile.ts'

const SECRET = 'test-secret'
const TOKEN = 'test-token'
const CLIENT_IP = '203.0.113.7'

const mockSiteverify = (payload: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload))

afterEach(() => vi.restoreAllMocks())

describe('verifyTurnstile', () => {
  it('accepts a token that siteverify approves and sends the secret, token and ip', async () => {
    const fetchSpy = mockSiteverify({ success: true })
    expect(await verifyTurnstile({ token: TOKEN, secret: SECRET, ip: CLIENT_IP })).toEqual({
      success: true
    })
    const [url, init] = fetchSpy.mock.calls[0]!
    expect(url).toBe(TURNSTILE.siteverifyUrl)
    const body = init?.body as FormData
    expect(body.get('secret')).toBe(SECRET)
    expect(body.get('response')).toBe(TOKEN)
    expect(body.get('remoteip')).toBe(CLIENT_IP)
  })

  it('leaves the ip out when there is none', async () => {
    const fetchSpy = mockSiteverify({ success: true })
    await verifyTurnstile({ token: TOKEN, secret: SECRET })
    expect((fetchSpy.mock.calls[0]![1]?.body as FormData).has('remoteip')).toBe(false)
  })

  it('rejects a token that siteverify refuses, with its error codes', async () => {
    mockSiteverify({ success: false, 'error-codes': ['invalid-input-response'] })
    expect(await verifyTurnstile({ token: TOKEN, secret: SECRET })).toEqual({
      success: false,
      reason: TURNSTILE.failure.rejected,
      errorCodes: ['invalid-input-response']
    })
  })

  it('fails without calling siteverify when the token is missing', async () => {
    const fetchSpy = mockSiteverify({ success: true })
    for (const token of [undefined, null, '']) {
      expect(await verifyTurnstile({ token, secret: SECRET })).toEqual({
        success: false,
        reason: TURNSTILE.failure.missingToken,
        errorCodes: []
      })
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails closed when siteverify is unreachable or answers nonsense', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
    expect(await verifyTurnstile({ token: TOKEN, secret: SECRET })).toMatchObject({
      success: false,
      reason: TURNSTILE.failure.unavailable
    })
    mockSiteverify({ unexpected: true })
    expect(await verifyTurnstile({ token: TOKEN, secret: SECRET })).toMatchObject({
      success: false,
      reason: TURNSTILE.failure.unavailable
    })
  })
})
