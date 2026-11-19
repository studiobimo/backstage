import { setSubmissionStatus } from '@studiobimo/backstage/admin'
import { testRegistry } from './test-registry'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db, useFreshPagesDb } from './pages-test-support'
import { answerTurnstile, submitted } from './forms-test-support'

const createdAtOf = (id: string) =>
  db.prepare('SELECT created_at FROM submissions WHERE id = ?').bind(id).first<number>('created_at')

describe('changing the status of a submission', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('refuses a status the form does not have', async () => {
    const { id } = await submitted()
    expect(await setSubmissionStatus(db, testRegistry, id, 'seated')).toEqual({
      ok: false,
      code: 'invalid'
    })
  })

  it('refuses a submission that does not exist', async () => {
    expect(await setSubmissionStatus(db, testRegistry, 'missing', 'declined')).toEqual({
      ok: false,
      code: 'not_found'
    })
  })

  it('moves the updated time forward and leaves the created time', async () => {
    const { id } = await submitted()
    const created = (await createdAtOf(id))!
    const later = created + 1000
    const changed = await setSubmissionStatus(db, testRegistry, id, 'declined', later)
    expect(changed).toMatchObject({
      ok: true,
      submission: { createdAt: created, updatedAt: later, status: 'declined' }
    })
  })
})
