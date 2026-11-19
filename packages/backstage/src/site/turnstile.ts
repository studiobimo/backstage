import { z } from 'zod'

export const TURNSTILE = {
  origin: 'https://challenges.cloudflare.com',
  siteverifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  failure: { missingToken: 'missing-token', rejected: 'rejected', unavailable: 'unavailable' }
} as const

export type TurnstileFailure = (typeof TURNSTILE.failure)[keyof typeof TURNSTILE.failure]

export type TurnstileResult =
  { success: true } | { success: false; reason: TurnstileFailure; errorCodes: string[] }

export interface TurnstileCheck {
  token: string | null | undefined
  secret: string
  ip?: string | null
}

const siteverifyResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).default([])
})

const failed = (reason: TurnstileFailure, errorCodes: string[] = []): TurnstileResult => ({
  success: false,
  reason,
  errorCodes
})

const siteverifyBody = ({ token, secret, ip }: TurnstileCheck & { token: string }) => {
  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  if (ip) body.set('remoteip', ip)
  return body
}

export const verifyTurnstile = async (check: TurnstileCheck): Promise<TurnstileResult> => {
  const { token } = check
  if (!token) return failed(TURNSTILE.failure.missingToken)
  try {
    const response = await fetch(TURNSTILE.siteverifyUrl, {
      method: 'POST',
      body: siteverifyBody({ ...check, token })
    })
    const parsed = siteverifyResponseSchema.safeParse(await response.json())
    if (!parsed.success) return failed(TURNSTILE.failure.unavailable)
    if (parsed.data.success) return { success: true }
    return failed(TURNSTILE.failure.rejected, parsed.data['error-codes'])
  } catch {
    return failed(TURNSTILE.failure.unavailable)
  }
}
