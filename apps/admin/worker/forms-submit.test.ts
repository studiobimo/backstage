import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('submitting a form declared in the template registry', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('stores the submission as new and returns its id and token', async () => {
    const result = await submit(reservation)
    expect(result).toMatchObject({ ok: true, id: expect.any(String), token: expect.any(String) })
    const [row] = await storedSubmissions()
    expect(row).toMatchObject({
      id: (result as { id: string }).id,
      form: 'reservation',
      status: 'new'
    })
    expect(JSON.parse(row!.payload as string)).toEqual({ ...reservation, name: 'Ana Pérez' })
  })

  it('keeps only a hash of the token', async () => {
    const result = await submit(reservation)
    const [row] = await storedSubmissions()
    expect(row!.token_hash).not.toBe((result as { token: string }).token)
    expect(row!.token_hash).toHaveLength(64)
  })

  it('sends the visitor address to Turnstile', async () => {
    await submit(reservation)
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect((init!.body as FormData).get('remoteip')).toBe(VISITOR.ip)
  })

  it('refuses a payload that does not match the schema, without storing it', async () => {
    const result = await submit({ ...reservation, seats: 0, time: '8pm' })
    expect(result).toMatchObject({ ok: false, code: 'invalid' })
    const { issues } = result as { issues: { path: string[] }[] }
    expect(issues.map(({ path }) => path[0]).sort()).toEqual(['seats', 'time'])
    expect(await storedSubmissions()).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses a form the registry does not declare', async () => {
    expect(await submit(reservation, TURNSTILE_TOKEN, 'contact')).toMatchObject({
      ok: false,
      code: 'not_found'
    })
  })

  it('refuses arguments that are not what the entrypoint takes', async () => {
    await expect(submit(reservation, null, 'x'.repeat(200))).rejects.toThrow(
      /Invalid request input/
    )
    await expect(
      entrypointWith().submit({ ip: '', country: 'ESP' }, 'reservation', reservation, null)
    ).rejects.toThrow(/Invalid request context/)
  })
})
