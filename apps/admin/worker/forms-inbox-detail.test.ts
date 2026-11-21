import type { InboxSubmission } from '@studiobimo/backstage/internal'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  answerTurnstile,
  publishedDish,
  reservation,
  sendForms,
  submit,
  submitted
} from './forms-test-support'
import { db, useFreshPagesDb } from './pages-test-support'

const FORM_PATH = '/forms/reservation'
const SUBMISSION_ID = 'id'
const ORDER_FIELD = 'preorder'

describe('a submission in the form inbox', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('shows a submission with the titles of the entries it refers to', async () => {
    const dish = await publishedDish('Paella')
    const result = (await submit({
      ...reservation,
      [ORDER_FIELD]: [{ dish: { mode: 'chosen', ids: [dish] }, quantity: 2 }]
    })) as { id: string }
    const response = await sendForms(`${FORM_PATH}/submissions/${result.id}`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      submission: InboxSubmission
      fields: { key: string; value: unknown }[]
    }
    expect(body.submission).toMatchObject({ id: result.id, status: 'new', updatedBy: null })
    const order = body.fields.find(({ key }) => key === ORDER_FIELD)?.value
    expect(order).toMatchObject({ kind: 'table', rows: [['Paella', '', '2']] })
  })

  it('does not show a submission through another form', async () => {
    const { id } = await submitted()
    expect((await sendForms(`/forms/other/submissions/${id}`)).status).toBe(404)
    expect((await sendForms(`${FORM_PATH}/submissions/${SUBMISSION_ID}-missing`)).status).toBe(404)
  })

  it('changes the status and records who changed it', async () => {
    const { id } = await submitted()
    const response = await sendForms(`${FORM_PATH}/submissions/${id}/status`, 'PUT', {
      status: 'confirmed'
    })
    expect(response.status).toBe(200)
    const { submission } = (await response.json()) as { submission: InboxSubmission }
    expect(submission).toMatchObject({ status: 'confirmed', updatedBy: 'Local developer' })
    const row = await db
      .prepare('SELECT status, updated_by FROM submissions WHERE id = ?')
      .bind(id)
      .first<{ status: string; updated_by: string | null }>()
    expect(row?.status).toBe('confirmed')
    expect(row?.updated_by).not.toBeNull()
  })

  it('refuses a status the form does not have', async () => {
    const { id } = await submitted()
    const response = await sendForms(`${FORM_PATH}/submissions/${id}/status`, 'PUT', {
      status: 'seated'
    })
    expect(response.status).toBe(400)
  })

  it('refuses a status change for a submission that is not there', async () => {
    const response = await sendForms(`${FORM_PATH}/submissions/missing/status`, 'PUT', {
      status: 'declined'
    })
    expect(response.status).toBe(404)
  })
})
