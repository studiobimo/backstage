import { createMiddleware } from 'hono/factory'

import { API_ERROR, logEvent } from '../index.ts'
import { respondWithError } from './respond.ts'

export interface AdminEnv {
  DB: D1Database
  SITE: KVNamespace
  MEDIA: R2Bucket
  ASSETS: Fetcher
  SITE_ORIGIN?: string
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  DEV_AUTH?: string
}

const REQUIRED_BINDINGS = [
  'DB',
  'SITE',
  'MEDIA',
  'ASSETS'
] as const satisfies readonly (keyof AdminEnv)[]

const missingBindings = (env: Partial<AdminEnv>) => REQUIRED_BINDINGS.filter((name) => !env[name])

export const requireBindings = createMiddleware<{ Bindings: AdminEnv }>(async (c, next) => {
  const missing = missingBindings(c.env ?? {})
  if (missing.length === 0) return next()
  logEvent('error', c, `${API_ERROR.bindingsMissing.message}: ${missing.join(', ')}`, { missing })
  return respondWithError(c, API_ERROR.bindingsMissing)
})
