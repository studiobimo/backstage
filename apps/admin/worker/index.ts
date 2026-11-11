import {
  API_ERROR,
  OBSERVABILITY,
  observe,
  reportError,
  respondHealthy
} from '@studiobimo/backstage'
import { registry } from 'backstage-site/registry'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { requireAccess } from './auth'
import { respondWithError } from './respond'
import { serveSpa } from './spa'
import { v1Routes } from './v1'

const API_PATH = '/api'

const api = new Hono<{ Bindings: Env }>().basePath(API_PATH)

api.use(...observe)
api.use(secureHeaders())
api.get(OBSERVABILITY.health.path, respondHealthy)
api.use(requireAccess)

api.route('/v1', v1Routes(registry))

api.notFound((c) => respondWithError(c, API_ERROR.notFound))
api.onError((error, c) => {
  reportError(c, error)
  return respondWithError(c, API_ERROR.internal)
})

const app = new Hono<{ Bindings: Env }>()

app.route('/', api)
app.get('*', (c) =>
  c.req.path.startsWith(`${API_PATH}/`) ? respondWithError(c, API_ERROR.notFound) : serveSpa(c)
)
app.notFound((c) => respondWithError(c, API_ERROR.notFound))

export default app
