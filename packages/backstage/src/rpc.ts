import { z } from 'zod'

export const RPC = {
  entrypoint: { className: 'AdminEntrypoint' },
  context: { ipMaxLength: 45, countryLength: 2, ipHeader: 'cf-connecting-ip' },
  errors: { invalidContext: 'Invalid request context' }
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
}
