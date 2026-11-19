import { pingResultSchema, RPC, requestContextSchema } from '../rpc.ts'
import type { RequestContext, VisitorRpc } from '../rpc.ts'
import {
  statusInputSchema,
  statusResultSchema,
  submitInputSchema,
  submitResultSchema
} from '../submissions.ts'

export const requestContextOf = (request: Request): RequestContext =>
  requestContextSchema.parse({
    ip: request.headers.get(RPC.context.ipHeader),
    country: request.cf?.country ?? null
  })

export const adminRpc = (binding: VisitorRpc) => ({
  ping: async (context: RequestContext) =>
    pingResultSchema.parse(await binding.ping(requestContextSchema.parse(context))),
  submit: async (
    context: RequestContext,
    form: string,
    payload: unknown,
    turnstileToken: string | null
  ) => {
    const input = submitInputSchema.parse({ form, payload, turnstileToken })
    return submitResultSchema.parse(
      await binding.submit(
        requestContextSchema.parse(context),
        input.form,
        input.payload,
        input.turnstileToken
      )
    )
  },
  status: async (context: RequestContext, token: string) =>
    statusResultSchema.parse(
      await binding.status(requestContextSchema.parse(context), statusInputSchema.parse(token))
    )
})
