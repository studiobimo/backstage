import { WorkerEntrypoint } from 'cloudflare:workers'
import { prettifyError } from 'zod'

import { RPC, requestContextSchema } from '../rpc.ts'
import type { PingResult, RequestContext, VisitorRpc } from '../rpc.ts'
import type { AdminEnv } from './env.ts'

const validContext = (context: RequestContext) => {
  const parsed = requestContextSchema.safeParse(context)
  if (parsed.success) return parsed.data
  throw new Error(`${RPC.errors.invalidContext}: ${prettifyError(parsed.error)}`)
}

export class AdminEntrypoint extends WorkerEntrypoint<AdminEnv> implements VisitorRpc {
  async ping(context: RequestContext): Promise<PingResult> {
    return { ok: true, context: validContext(context) }
  }
}
