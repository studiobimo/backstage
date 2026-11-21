import { describe, expect, it, vi } from 'vitest'

import { API_ERROR } from '../../errors.ts'
import { RPC } from '../../rpc.ts'
import { RATE_LIMIT, rateLimited, type RateLimitBinding } from './rate-limit.ts'

const VISITOR_IP = '203.0.113.7'
const RETRY_AFTER = 30

const binding = (success: boolean) => {
  const limit = vi.fn<RateLimitBinding['limit']>(async () => ({ success }))
  return { limit }
}

const requestFrom = (ip?: string) =>
  new Request('https://site.example/forms/contact', {
    method: 'POST',
    headers: ip ? { [RPC.context.ipHeader]: ip } : {}
  })

describe('rateLimited', () => {
  it('returns null and keys the limiter on the visitor address when under the limit', async () => {
    const limiter = binding(true)
    expect(await rateLimited(limiter, requestFrom(VISITOR_IP))).toBeNull()
    expect(limiter.limit).toHaveBeenCalledWith({ key: VISITOR_IP })
  })

  it('answers 429 with Retry-After when the limit is exceeded', async () => {
    const response = await rateLimited(binding(false), requestFrom(VISITOR_IP))
    expect(response?.status).toBe(API_ERROR.tooManyRequests.status)
    expect(response?.headers.get(RATE_LIMIT.retryAfter.header)).toBe(
      String(RATE_LIMIT.retryAfter.seconds)
    )
    expect(await response?.json()).toEqual({
      code: API_ERROR.tooManyRequests.code,
      error: API_ERROR.tooManyRequests.message,
      issues: []
    })
  })

  it('takes a custom Retry-After and shares one key for requests with no address', async () => {
    const limiter = binding(false)
    const response = await rateLimited(limiter, requestFrom(), RETRY_AFTER)
    expect(response?.headers.get(RATE_LIMIT.retryAfter.header)).toBe(String(RETRY_AFTER))
    expect(limiter.limit).toHaveBeenCalledWith({ key: RATE_LIMIT.anonymousKey })
  })
})
