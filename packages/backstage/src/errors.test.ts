import { describe, expect, it } from 'vitest'

import { API_ERROR, errorBody } from './index.ts'

describe('API_ERROR', () => {
  it('gives every error its own code', () => {
    const codes = Object.values(API_ERROR).map(({ code }) => code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('uses only client and server error statuses', () => {
    for (const { status } of Object.values(API_ERROR)) {
      expect(status).toBeGreaterThanOrEqual(400)
      expect(status).toBeLessThan(600)
    }
  })

  it('builds the body from the message and the code', () => {
    expect(errorBody(API_ERROR.notFound)).toEqual({ error: 'Not found', code: 'not_found' })
  })
})
