import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { requestId } from 'hono/request-id'

export const OBSERVABILITY = {
  health: { path: '/health', body: { ok: true } },
  requestId: { header: 'X-Request-Id' }
} as const

type LogLevel = 'info' | 'error'

export const logEvent = (
  level: LogLevel,
  context: Context,
  message: string,
  fields: Record<string, unknown> = {}
) => {
  console[level](JSON.stringify({ level, requestId: context.get('requestId'), message, ...fields }))
}

export const respondHealthy = (context: Context) => context.json(OBSERVABILITY.health.body)

export const reportError = (context: Context, error: unknown) =>
  logEvent('error', context, error instanceof Error ? error.message : String(error), {
    stack: error instanceof Error ? error.stack : undefined
  })

const logRequest = createMiddleware(async (context, next) => {
  const startedAt = Date.now()
  await next()
  logEvent('info', context, 'request', {
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Date.now() - startedAt
  })
})

export const observe = [
  requestId({ headerName: OBSERVABILITY.requestId.header }),
  logRequest
] as const
