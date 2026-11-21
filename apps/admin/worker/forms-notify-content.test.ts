import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFreshPagesDb } from './pages-test-support'
import {
  answerTurnstile,
  email,
  entrypointWith,
  publishedDish,
  reservation,
  TURNSTILE_TOKEN,
  VISITOR
} from './forms-test-support'

const ADMIN_ORIGIN = 'https://admin.example.com'

const submitWith = async (payload: unknown = reservation, overrides = {}) => {
  const result = (await entrypointWith({ ADMIN_ORIGIN, ...overrides }).submit(
    VISITOR,
    'reservation',
    payload,
    TURNSTILE_TOKEN
  )) as { id: string }
  const [message] = email.send.mock.calls[0] as unknown as [
    { subject: string; text: string; html: string }
  ]
  return { id: result.id, ...message }
}

describe('the content of the notification email', () => {
  useFreshPagesDb()
  beforeEach(() => {
    answerTurnstile(true)
    email.send.mockClear()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('prints labelled fields and the subject built from the payload', async () => {
    const { subject, text } = await submitWith()
    expect(subject).toBe('Table for 4 on 2026-12-24')
    expect(text).toContain('Seats: 4')
    expect(text).toContain('Date: Dec 24, 2026')
    expect(text).toContain('Name: Ana Pérez')
  })

  it('prints a reference as the label of the entry and a nested field as rows', async () => {
    const dish = await publishedDish('Paella')
    const { text, html } = await submitWith({
      ...reservation,
      preorder: [{ dish: { mode: 'chosen', ids: [dish] }, quantity: 2 }]
    })
    expect(text).toContain('Dish: Paella, Quantity: 2')
    expect(html).toContain('<td>Paella</td>')
    expect(text).not.toContain('"mode"')
  })

  it('links to the submission in the admin inbox', async () => {
    const { id, text, html } = await submitWith()
    const link = `${ADMIN_ORIGIN}/forms/reservation/${id}`
    expect(text).toContain(link)
    expect(html).toContain(`<a href="${link}">`)
  })

  it('leaves the link out when the admin origin is not set', async () => {
    const { text } = await submitWith(reservation, { ADMIN_ORIGIN: undefined })
    expect(text).not.toContain('/forms/')
  })

  it('never prints an excluded field, in text or HTML', async () => {
    const { text, html } = await submitWith()
    expect(text).not.toContain('600 000 000')
    expect(html).not.toContain('600 000 000')
  })

  it('escapes what a visitor typed in the HTML part', async () => {
    const { html } = await submitWith({ ...reservation, name: '<b>Ana</b> & co' })
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt; &amp; co')
    expect(html).not.toContain('<b>')
  })
})
