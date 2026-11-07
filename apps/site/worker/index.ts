import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

// Every request reaches the Worker (wrangler.jsonc has no assets), so these headers are on
// every response the site sends. The policy allows nothing the pages do not use: no script
// at all, and styles, images and fonts only from the site itself. A block that needs more
// widens it here, in review, never with 'unsafe-inline'.
const app = new Hono<{ Bindings: Env }>()

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

// Until pages are published from the admin, every path is this one placeholder.
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
  console.error(error)
  return c.text('Internal error', 500)
})

export default app
