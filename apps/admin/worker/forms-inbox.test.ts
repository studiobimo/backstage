import type { FormDescription, InboxSubmission } from '@studiobimo/backstage/internal'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { answerTurnstile, reservation, sendForms, submit, submitted } from './forms-test-support'
import { db, useFreshPagesDb } from './pages-test-support'

const FORM_PATH = '/forms/reservation'

const setCreatedAt = (id: string, createdAt: number) =>
  db.prepare('UPDATE submissions SET created_at = ? WHERE id = ?').bind(createdAt, id).run()

const submissionsAt = async (query = '') =>
  (
    (await (await sendForms(`${FORM_PATH}/submissions${query}`)).json()) as {
      submissions: InboxSubmission[]
    }
  ).submissions

const submitOn = async (date: string) => {
  const result = (await submit({ ...reservation, date })) as { id: string }
  return result.id
}

describe('the form inbox', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('lists the declared forms with the count of new submissions', async () => {
    const { id } = await submitted()
    await submitted()
    await sendForms(`${FORM_PATH}/submissions/${id}/status`, 'PUT', { status: 'confirmed' })
    const { forms } = (await (await sendForms('/forms')).json()) as { forms: FormDescription[] }
    expect(forms).toHaveLength(1)
    expect(forms[0]).toMatchObject({
      name: 'reservation',
      newStatus: 'new',
      newCount: 1,
      dateField: 'date',
      statuses: ['new', 'confirmed', 'declined']
    })
  })

  it('lists submissions newest first', async () => {
    const first = await submitOn('2026-12-24')
    const second = await submitOn('2026-12-25')
    await setCreatedAt(first, 1000)
    await setCreatedAt(second, 2000)
    expect((await submissionsAt()).map(({ id }) => id)).toEqual([second, first])
  })

  it('filters by status', async () => {
    const { id } = await submitted()
    await submitted()
    await sendForms(`${FORM_PATH}/submissions/${id}/status`, 'PUT', { status: 'declined' })
    expect((await submissionsAt('?status=declined')).map((row) => row.id)).toEqual([id])
    expect(await submissionsAt('?status=new')).toHaveLength(1)
  })

  it('filters by the date field of the schema', async () => {
    const early = await submitOn('2026-12-20')
    const middle = await submitOn('2026-12-24')
    await submitOn('2026-12-30')
    const ids = async (query: string) => (await submissionsAt(query)).map(({ id }) => id).sort()
    expect(await ids('?from=2026-12-21&to=2026-12-25')).toEqual([middle])
    expect(await ids('?to=2026-12-24')).toEqual([early, middle].sort())
    expect(await ids('?from=2027-01-01')).toEqual([])
  })

  it('refuses a malformed date', async () => {
    const response = await sendForms(`${FORM_PATH}/submissions?from=tomorrow`)
    expect(response.status).toBe(400)
  })

  it('answers not found for an unknown form', async () => {
    expect((await sendForms('/forms/nope/submissions')).status).toBe(404)
    expect((await sendForms('/forms/nope/submissions/x')).status).toBe(404)
  })
})
