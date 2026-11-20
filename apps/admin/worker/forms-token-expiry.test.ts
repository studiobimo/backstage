import { anonymiseSubmission, deleteSubmission, revokeToken } from '@studiobimo/backstage/admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  answerTurnstile,
  entrypointWith,
  sendForms,
  setSubmissionColumn,
  storedSubmissions,
  submitted,
  VISITOR
} from './forms-test-support'
import { db, kv, useFreshPagesDb } from './pages-test-support'
import { testRegistry } from './test-registry'

const MS_PER_DAY = 86_400_000
const DEFAULT_EXPIRY_DAYS = 30
const NOT_FOUND = { ok: false, code: 'not_found' }
const SUBMISSIONS_PATH = '/forms/reservation/submissions'

const statusOf = (token: string) => entrypointWith().status(VISITOR, token)

describe('the lifetime of a status token', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('expires after the default number of days from when it was issued', async () => {
    await submitted()
    const [row] = (await storedSubmissions()) as { created_at: number; token_expires_at: number }[]
    expect(row!.token_expires_at - row!.created_at).toBe(DEFAULT_EXPIRY_DAYS * MS_PER_DAY)
  })

  it('answers not found once the token has expired', async () => {
    const { id, token } = await submitted()
    expect(await statusOf(token)).toMatchObject({ ok: true })
    await setSubmissionColumn(id, 'token_expires_at', Date.now() - 1)
    expect(await statusOf(token)).toEqual(NOT_FOUND)
  })

  it('stops a revoked token at once and tells the inbox', async () => {
    const { id, token } = await submitted()
    const response = await sendForms(`${SUBMISSIONS_PATH}/${id}/revoke-token`, 'POST')
    expect(await response.json()).toMatchObject({ submission: { id, tokenActive: false } })
    expect(await statusOf(token)).toEqual(NOT_FOUND)
  })

  it('reports an active token in the inbox', async () => {
    const { id } = await submitted()
    const body = (await (await sendForms(`${SUBMISSIONS_PATH}/${id}`)).json()) as {
      submission: { tokenActive: boolean }
    }
    expect(body.submission.tokenActive).toBe(true)
  })

  it('stops the token when the submission is deleted', async () => {
    const { id, token } = await submitted()
    const response = await sendForms(`${SUBMISSIONS_PATH}/${id}`, 'DELETE')
    expect(response.status).toBe(204)
    expect(await statusOf(token)).toEqual(NOT_FOUND)
    expect(await storedSubmissions()).toHaveLength(0)
    expect((await sendForms(`${SUBMISSIONS_PATH}/${id}`, 'DELETE')).status).toBe(404)
  })

  it('drops the fields and stops the token when the submission is anonymised', async () => {
    const { id, token } = await submitted()
    const response = await sendForms(`${SUBMISSIONS_PATH}/${id}/anonymise`, 'POST')
    expect(await response.json()).toMatchObject({
      submission: { id, status: 'new', payload: {}, tokenActive: false }
    })
    expect(await statusOf(token)).toEqual(NOT_FOUND)
    expect(await storedSubmissions()).toHaveLength(1)
  })

  it('answers not found for a submission that does not exist', async () => {
    expect(await revokeToken(db, testRegistry, 'missing')).toEqual(NOT_FOUND)
    expect(await anonymiseSubmission(db, kv, testRegistry, 'missing')).toEqual(NOT_FOUND)
    expect(await deleteSubmission(db, kv, testRegistry, 'missing')).toBe(false)
  })
})
