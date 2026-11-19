import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFreshPagesDb } from './pages-test-support'
import {
  answerTurnstile,
  draftDish,
  publishedDish,
  reservation,
  storedSubmissions,
  submit
} from './forms-test-support'

describe('a form field that refers to a menu entry', () => {
  useFreshPagesDb()
  beforeEach(() => answerTurnstile(true))
  afterEach(() => vi.unstubAllGlobals())

  const withDish = (dish: unknown) => ({ ...reservation, preorder: [{ dish, quantity: 2 }] })
  const chosen = (...ids: string[]) => ({ mode: 'chosen', ids })

  it('accepts a published dish', async () => {
    const id = await publishedDish()
    expect(await submit(withDish(chosen(id)))).toMatchObject({ ok: true })
  })

  it.each([
    ['an id that does not exist', async () => chosen('nope')],
    ['a dish that is not published', async () => chosen(await draftDish())],
    ['the latest dishes rather than a chosen one', async () => ({ mode: 'latest', count: 1 })]
  ])('refuses %s', async (_name, dish) => {
    const result = await submit(withDish(await dish()))
    expect(result).toMatchObject({
      ok: false,
      code: 'invalid',
      issues: [{ path: ['preorder[0].dish'], code: 'unknown_reference' }]
    })
    expect(await storedSubmissions()).toEqual([])
  })
})
