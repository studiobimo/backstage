import { WorkerEntrypoint } from 'cloudflare:workers'
import { prettifyError, type z, type ZodType } from 'zod'

import type { AdminRegistry } from '../collections.ts'
import { RPC, requestContextSchema } from '../rpc.ts'
import type { PingResult, RequestContext, VisitorRpc } from '../rpc.ts'
import {
  statusInputSchema,
  submitInputSchema,
  type StatusResult,
  type SubmitResult
} from '../submissions.ts'
import type { AdminEnv } from './env.ts'
import { cloudflareMailer, type Mailer } from './mailer.ts'
import { statusOfSubmission, submitForm } from './submissions.ts'

export interface EntrypointOptions {
  mailer?: Mailer
}

export type AdminEntrypointClass = new (
  ctx: ExecutionContext,
  env: AdminEnv
) => WorkerEntrypoint<AdminEnv> & VisitorRpc

const parsedOrThrow = <S extends ZodType>(message: string, schema: S, value: unknown) => {
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data as z.output<S>
  throw new Error(`${message}: ${prettifyError(parsed.error)}`)
}

const validContext = (context: RequestContext) =>
  parsedOrThrow(RPC.errors.invalidContext, requestContextSchema, context)

export const createAdminEntrypoint = (
  registry: AdminRegistry,
  { mailer = cloudflareMailer }: EntrypointOptions = {}
): AdminEntrypointClass =>
  class AdminEntrypoint extends WorkerEntrypoint<AdminEnv> implements VisitorRpc {
    async ping(context: RequestContext): Promise<PingResult> {
      return { ok: true, context: validContext(context) }
    }

    async submit(
      context: RequestContext,
      form: string,
      payload: unknown,
      turnstileToken: string | null
    ): Promise<SubmitResult> {
      const visitor = validContext(context)
      const input = parsedOrThrow(RPC.errors.invalidInput, submitInputSchema, {
        form,
        payload,
        turnstileToken
      })
      return submitForm(this.env, { registry, mailer }, visitor, input)
    }

    async status(context: RequestContext, token: string): Promise<StatusResult> {
      validContext(context)
      const valid = parsedOrThrow(RPC.errors.invalidInput, statusInputSchema, token)
      return statusOfSubmission(this.env, { registry, mailer }, valid)
    }
  }
