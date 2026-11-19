import { pingResultSchema, RPC, requestContextSchema } from '../rpc.ts'
import type { RequestContext, VisitorRpc } from '../rpc.ts'

export const requestContextOf = (request: Request): RequestContext =>
  requestContextSchema.parse({
    ip: request.headers.get(RPC.context.ipHeader),
    country: request.cf?.country ?? null
  })

export const adminRpc = (binding: VisitorRpc) => ({
  ping: async (context: RequestContext) =>
    pingResultSchema.parse(await binding.ping(requestContextSchema.parse(context)))
})
