import { setSubmissionStatus } from '@studiobimo/backstage/admin'
import { testRegistry } from './test-registry'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db, useFreshPagesDb } from './pages-test-support'
import { answerTurnstile, entrypointWith, submitted, VISITOR } from './forms-test-support'

const statusOf = (token: string) => entrypointWith().status(VISITOR, token)

describe('following a submission by its token', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('returns the status and only the fields the form marks public', async () => {
    const { token } = await submitted()
    expect(await statusOf(token)).toEqual({
      ok: true,
      form: 'reservation',
      status: 'new',
      fields: { seats: 4, date: '2026-12-24', time: '20:30' }
    })
  })

  it('never returns the private fields', async () => {
    const { token } = await submitted()
    const body = JSON.stringify(await statusOf(token))
    expect(body).not.toContain('phone')
    expect(body).not.toContain('Ana')
  })

  it.each(['f'.repeat(48), 'short', ''])('answers not found for the token "%s"', async (token) => {
    expect(await statusOf(token)).toEqual({ ok: false, code: 'not_found' })
  })

  it('does not accept the id in place of the token', async () => {
    const { id } = await submitted()
    expect(await statusOf(id)).toEqual({ ok: false, code: 'not_found' })
  })

  it('shows the new status once the owner changes it', async () => {
    const { id, token } = await submitted()
    const changed = await setSubmissionStatus(db, testRegistry, id, 'confirmed')
    expect(changed).toMatchObject({ ok: true, submission: { status: 'confirmed' } })
    expect(await statusOf(token)).toMatchObject({ ok: true, status: 'confirmed' })
  })
})
