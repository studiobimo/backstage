import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'

import { API_ERROR } from '../errors.ts'
import { OBSERVABILITY, observe, reportError, respondHealthy } from '../observability.ts'
import type { Registry } from '../blocks.ts'
import { requireAccess } from './auth.ts'
import { requireBindings, type AdminEnv } from './env.ts'
import { respondWithError } from './respond.ts'
import { serveSpa } from './spa.ts'
import { v1Routes } from './v1.ts'

const API_PATH = '/api'

export const createAdmin = (registry: Registry) => {
  const api = new Hono<{ Bindings: AdminEnv }>().basePath(API_PATH)

  api.use(...observe)
  api.use(secureHeaders())
  api.get(OBSERVABILITY.health.path, respondHealthy)
  api.use(requireBindings)
  api.use(requireAccess)
  api.use(csrf())

  api.route('/v1', v1Routes(registry))

  api.notFound((c) => respondWithError(c, API_ERROR.notFound))
  api.onError((error, c) => {
    if (error instanceof HTTPException && error.status === API_ERROR.forbidden.status) {
      return respondWithError(c, API_ERROR.forbidden)
    }
    reportError(c, error)
    return respondWithError(c, API_ERROR.internal)
  })

  const app = new Hono<{ Bindings: AdminEnv }>()

  app.route('/', api)
  app.get('*', requireBindings, (c) =>
    c.req.path.startsWith(`${API_PATH}/`) ? respondWithError(c, API_ERROR.notFound) : serveSpa(c)
  )
  app.notFound((c) => respondWithError(c, API_ERROR.notFound))

  return app
}

export type { AdminEnv } from './env.ts'
export { ensureUser } from '../db/users.ts'
export { writeSiteSettings } from '../db/settings.ts'
export { writeSiteBlock } from '../db/site-blocks.ts'
