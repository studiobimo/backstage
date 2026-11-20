import { API_ERROR } from '../../errors.ts'
import { requestContextOf } from '../rpc.ts'

export const RATE_LIMIT = {
  retryAfter: { header: 'Retry-After', seconds: 60 },
  anonymousKey: 'unknown'
} as const

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export const rateLimited = async (
  binding: RateLimitBinding,
  request: Request,
  retryAfterSeconds: number = RATE_LIMIT.retryAfter.seconds
): Promise<Response | null> => {
  const { ip } = requestContextOf(request)
  const { success } = await binding.limit({ key: ip ?? RATE_LIMIT.anonymousKey })
  if (success) return null
  const { code, message, status } = API_ERROR.tooManyRequests
  return Response.json(
    { code, error: message, issues: [] },
    { status, headers: { [RATE_LIMIT.retryAfter.header]: String(retryAfterSeconds) } }
  )
}
