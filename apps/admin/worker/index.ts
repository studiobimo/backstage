import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { blocksRoutes } from './blocks'
import { registry } from './registry'

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use(secureHeaders())

app.get('/health', (c) => c.json({ ok: true }))
app.route('/v1/blocks', blocksRoutes(registry))

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Internal error' }, 500)
})

export default app
