import { OBSERVABILITY, observe, reportError, respondHealthy } from '@studiobimo/backstage'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono<{ Bindings: Env }>()

app.use(...observe)
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      fontSrc: ["'self'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    },
    xFrameOptions: 'DENY',
    permissionsPolicy: {
      camera: [],
      geolocation: [],
      microphone: [],
      payment: [],
      usb: []
    }
  })
)

app.get(OBSERVABILITY.health.path, respondHealthy)

const placeholder = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Backstage</title>
  </head>
  <body>
    <main>
      <h1>Backstage</h1>
      <p>Nothing has been published yet.</p>
    </main>
  </body>
</html>
`

app.get('/', (c) => c.html(placeholder))

app.notFound((c) => c.text('Not found', 404))
app.onError((error, c) => {
  reportError(c, error)
  return c.text('Internal error', 500)
})

export default app
