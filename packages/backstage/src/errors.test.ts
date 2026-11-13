import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  API_ERROR,
  errorBody,
  fieldIssuesOf,
  invalidBody,
  invalidResponseSchema
} from './errors.ts'

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

describe('fieldIssuesOf', () => {
  const schema = z.object({
    name: z.string().trim().min(1).max(5),
    tags: z.array(z.string()).min(2)
  })

  it('keeps the path, the code and the parameters, and drops the message', () => {
    const parsed = schema.safeParse({ name: '   ', tags: ['a'] })
    expect(parsed.success ? [] : fieldIssuesOf(parsed.error)).toEqual([
      { path: ['name'], code: 'too_small', origin: 'string', minimum: 1 },
      { path: ['tags'], code: 'too_small', origin: 'array', minimum: 2 }
    ])
  })

  it('answers a body every issue of which matches the shared schema', () => {
    const parsed = schema.safeParse({ name: 7 })
    const issues = parsed.success ? [] : fieldIssuesOf(parsed.error)
    expect(invalidResponseSchema.safeParse(invalidBody(issues)).success).toBe(true)
    expect(invalidBody(issues)).toMatchObject({ code: 'invalid', error: 'Invalid input' })
  })
})
