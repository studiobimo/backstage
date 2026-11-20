import { purgeExpiredSubmissions } from '@studiobimo/backstage/admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  answerTurnstile,
  sendForms,
  setSubmissionColumn,
  storedSubmissions,
  submitted
} from './forms-test-support'
import { db, kv, useFreshPagesDb } from './pages-test-support'
import { testRegistry } from './test-registry'

const MS_PER_DAY = 86_400_000
const RETENTION_DAYS = 365
const SUBMISSIONS_PATH = '/forms/reservation/submissions'

const reservationForm = () => testRegistry.forms!.get('reservation')!

const ageBeyondRetention = (id: string) =>
  setSubmissionColumn(id, 'created_at', Date.now() - (RETENTION_DAYS + 1) * MS_PER_DAY)

describe('retention of old submissions', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  beforeEach(() => {
    reservationForm().retention = { days: RETENTION_DAYS }
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    reservationForm().retention = undefined
  })

  it('purges submissions older than the retention and keeps newer ones', async () => {
    const old = await submitted()
    const recent = await submitted()
    await ageBeyondRetention(old.id)
    expect(await purgeExpiredSubmissions(db, kv, reservationForm())).toBe(1)
    expect((await storedSubmissions()).map((row) => row.id)).toEqual([recent.id])
  })

  it('purges when the inbox is listed', async () => {
    const old = await submitted()
    await ageBeyondRetention(old.id)
    const body = (await (await sendForms(SUBMISSIONS_PATH)).json()) as { submissions: unknown[] }
    expect(body.submissions).toEqual([])
  })
})
