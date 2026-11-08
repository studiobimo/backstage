import { API_ERROR } from '@studiobimo/backstage'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { requireAccess } from './auth'
import { registry } from './registry'
import { respondWithError } from './respond'
import { v1Routes } from './v1'

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use(secureHeaders())
app.use(requireAccess)

app.get('/health', (c) => c.json({ ok: true }))
app.route('/v1', v1Routes(registry))

app.notFound((c) => respondWithError(c, API_ERROR.notFound))
app.onError((error, c) => {
  console.error(error)
  return respondWithError(c, API_ERROR.internal)
})

export default app
