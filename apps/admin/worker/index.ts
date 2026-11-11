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
import { v1Routes } from './v1'

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use(...observe)
app.use(secureHeaders())
app.get(OBSERVABILITY.health.path, respondHealthy)
app.use(requireAccess)

app.route('/v1', v1Routes(registry))

app.notFound((c) => respondWithError(c, API_ERROR.notFound))
app.onError((error, c) => {
  reportError(c, error)
  return respondWithError(c, API_ERROR.internal)
})

export default app
