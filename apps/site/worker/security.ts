import { BLOCK_PREVIEW } from '@studiobimo/backstage'
import { createMiddleware } from 'hono/factory'
import { secureHeaders } from 'hono/secure-headers'

const FRAME_NONE = ["'none'"]

const headersFor = (frameAncestors: string[], xFrameOptions: 'DENY' | false) =>
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      fontSrc: ["'self'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors
    },
    xFrameOptions,
    permissionsPolicy: {
      camera: [],
      geolocation: [],
      microphone: [],
      payment: [],
      usb: []
    }
  })

const denyFraming = headersFor(FRAME_NONE, 'DENY')

const isPreviewPath = (path: string) => path.startsWith(`${BLOCK_PREVIEW.path}/`)

export const securityHeaders = createMiddleware<{ Bindings: Env }>((c, next) => {
  const adminOrigin = c.env.ADMIN_ORIGIN
  if (!isPreviewPath(c.req.path) || !adminOrigin) return denyFraming(c, next)
  return headersFor([adminOrigin], false)(c, next)
})
