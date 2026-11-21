import type { InboxSubmission } from '@studiobimo/backstage/internal'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  answerTurnstile,
  publishedDish,
  reservation,
  sendForms,
  submit
} from './forms-test-support'
import { db, useFreshPagesDb } from './pages-test-support'

const FORM_PATH = '/forms/reservation'
const PAGE_SIZE = 25

interface Listing {
  columns: { key: string; label: string }[]
  submissions: (InboxSubmission & { cells: string[] })[]
  total: number
  page: number
  pageSize: number
}

const listing = async (query = '') =>
  (await (await sendForms(`${FORM_PATH}/submissions${query}`)).json()) as Listing

const insertMany = (count: number) =>
  db.batch(
    Array.from({ length: count }, (_, index) =>
      db
        .prepare(
          'INSERT INTO submissions (id, form, token_hash, payload, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          `id-${index}`,
          'reservation',
          `hash-${index}`,
          JSON.stringify(reservation),
          'new',
          index,
          index
        )
    )
  )

describe('structured submissions in the form inbox', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('shows the declared columns with a reference as its label and a date and time pair', async () => {
    const dish = await publishedDish('Paella')
    await submit({ ...reservation, favorite: { mode: 'chosen', ids: [dish] } })
    const { columns, submissions } = await listing()
    expect(columns.map(({ label }) => label)).toEqual(['Name', 'Date', 'Favorite'])
    expect(submissions[0]?.cells).toEqual(['Ana Pérez', 'Dec 24, 2026 20:30', 'Paella'])
  })

  it('pages the list and reports the total', async () => {
    await insertMany(PAGE_SIZE + 1)
    const first = await listing()
    expect(first).toMatchObject({ total: PAGE_SIZE + 1, page: 1, pageSize: PAGE_SIZE })
    expect(first.submissions).toHaveLength(PAGE_SIZE)
    const second = await listing('?page=2')
    expect(second.submissions.map(({ id }) => id)).toEqual(['id-0'])
  })

  it('refuses a page below the first', async () => {
    expect((await sendForms(`${FORM_PATH}/submissions?page=0`)).status).toBe(400)
  })

  it('lists an anonymised submission with empty cells', async () => {
    await submit(reservation)
    const id = (await listing()).submissions[0]?.id
    await sendForms(`${FORM_PATH}/submissions/${id}/anonymise`, 'POST')
    expect((await listing()).submissions[0]?.cells).toEqual(['', '', ''])
  })
})
