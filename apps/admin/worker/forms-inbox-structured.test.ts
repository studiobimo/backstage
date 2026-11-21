import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  answerTurnstile,
  publishedDish,
  reservation,
  sendForms,
  submit
} from './forms-test-support'
import { useFreshPagesDb } from './pages-test-support'

const FORM_PATH = '/forms/reservation'

interface Detail {
  fields: { key: string; label: string; value: unknown }[]
}

const submitted = async (payload: unknown = reservation) =>
  ((await submit(payload)) as { id: string }).id

const detailOf = async (id: string, query = '') =>
  (await (await sendForms(`${FORM_PATH}/submissions/${id}${query}`)).json()) as Detail

describe('a structured submission in the form inbox', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  it('labels the fields in the language it is asked for', async () => {
    const { fields } = await detailOf(await submitted(), '?language=es')
    expect(fields.find(({ key }) => key === 'seats')?.label).toBe('Comensales')
  })

  it('shows an array of objects as a table with a money total', async () => {
    const dish = await publishedDish('Paella')
    const id = await submitted({
      ...reservation,
      preorder: [
        { dish: { mode: 'chosen', ids: [dish] }, quantity: 1, price: 1250 },
        { dish: { mode: 'chosen', ids: [dish] }, quantity: 2, price: 500 }
      ]
    })
    const { fields } = await detailOf(id)
    expect(fields.find(({ key }) => key === 'preorder')?.value).toEqual({
      kind: 'table',
      columns: [
        { key: 'dish', label: 'Dish' },
        { key: 'price', label: 'Price' },
        { key: 'quantity', label: 'Quantity' }
      ],
      rows: [
        ['Paella', '$12.50', '1'],
        ['Paella', '$5.00', '2']
      ],
      total: { label: 'Total', text: '$17.50' }
    })
  })

  it('shows an anonymised submission with empty fields', async () => {
    const id = await submitted()
    await sendForms(`${FORM_PATH}/submissions/${id}/anonymise`, 'POST')
    const { fields } = await detailOf(id)
    expect(fields.every(({ value }) => JSON.stringify(value) === '{"kind":"text","text":""}')).toBe(
      true
    )
  })
})
