import { createMiddleware } from 'hono/factory'

import { API_ERROR } from '../errors.ts'
import { logEvent } from '../observability.ts'
import type { EmailBinding } from './mailer.ts'
import { respondWithError } from './respond.ts'

export interface AdminEnv {
  DB: D1Database
  SITE: KVNamespace
  MEDIA: R2Bucket
  ASSETS: Fetcher
  SITE_ORIGIN?: string
  ADMIN_ORIGIN?: string
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  DEV_AUTH?: string
  AUTH_MODE?: string
  OWNER_EMAIL?: string
  AUTH_EMAIL_FROM?: string
  EMAIL?: EmailBinding
  TURNSTILE_SECRET?: string
}

const BINDINGS = {
  required: ['DB', 'SITE', 'MEDIA', 'ASSETS'],
  missingMessage: 'The worker is missing a required binding'
} as const satisfies { required: readonly (keyof AdminEnv)[]; missingMessage: string }

const missingBindings = (env: Partial<AdminEnv>) => BINDINGS.required.filter((name) => !env[name])

export const requireBindings = createMiddleware<{ Bindings: AdminEnv }>(async (c, next) => {
  const missing = missingBindings(c.env ?? {})
  if (missing.length === 0) return next()
  logEvent('error', c, `${BINDINGS.missingMessage}: ${missing.join(', ')}`, { missing })
  return respondWithError(c, API_ERROR.internal)
})
