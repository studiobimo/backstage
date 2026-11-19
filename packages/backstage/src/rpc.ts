import { z } from 'zod'

import type { StatusResult, SubmitResult } from './submissions.ts'

export const RPC = {
  entrypoint: { className: 'AdminEntrypoint' },
  context: { ipMaxLength: 45, countryLength: 2, ipHeader: 'cf-connecting-ip' },
  errors: { invalidContext: 'Invalid request context', invalidInput: 'Invalid request input' }
} as const

export const requestContextSchema = z.object({
  ip: z.string().min(1).max(RPC.context.ipMaxLength).nullable(),
  country: z.string().length(RPC.context.countryLength).nullable()
})

export const pingResultSchema = z.object({
  ok: z.literal(true),
  context: requestContextSchema
})

export type RequestContext = z.infer<typeof requestContextSchema>
export type PingResult = z.infer<typeof pingResultSchema>

export interface VisitorRpc {
  ping(context: RequestContext): Promise<PingResult>
  submit(
    context: RequestContext,
    form: string,
    payload: unknown,
    turnstileToken: string | null
  ): Promise<SubmitResult>
  status(context: RequestContext, token: string): Promise<StatusResult>
}
