import { BLOCK_PREVIEW } from '@studiobimo/backstage'
import { createMiddleware } from 'hono/factory'
import { secureHeaders } from 'hono/secure-headers'

import { THUMBNAIL } from './preview'

const FRAME_NONE = ["'none'"]

const headersFor = (
  frameAncestors: string[],
  xFrameOptions: 'DENY' | false,
  resourcePolicy: 'same-origin' | 'cross-origin' = 'same-origin'
) =>
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
    crossOriginResourcePolicy: resourcePolicy,
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

const isThumbnailPath = (path: string) => isPreviewPath(path) && path.endsWith(`/${THUMBNAIL.file}`)

export const securityHeaders = createMiddleware<{ Bindings: Env }>((c, next) => {
  const adminOrigin = c.env.ADMIN_ORIGIN
  if (!isPreviewPath(c.req.path) || !adminOrigin) return denyFraming(c, next)
  const resourcePolicy = isThumbnailPath(c.req.path) ? 'cross-origin' : 'same-origin'
  return headersFor([adminOrigin], false, resourcePolicy)(c, next)
})
