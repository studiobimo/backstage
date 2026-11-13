import { createMiddleware } from 'hono/factory'
import { secureHeaders } from 'hono/secure-headers'

import { BLOCK_PREVIEW } from '../../blocks.ts'
import type { SiteEnv } from '../index.ts'

const ADDITION_KEYS = [
  'styleSrc',
  'imgSrc',
  'fontSrc',
  'mediaSrc',
  'connectSrc',
  'scriptSrc'
] as const

type AdditionKey = (typeof ADDITION_KEYS)[number]

export type ContentSecurityPolicyAdditions = Partial<Record<AdditionKey, readonly string[]>>

const SELF = ["'self'"]
const NONE = ["'none'"]
const SELF_BY_DEFAULT: readonly AdditionKey[] = ['styleSrc', 'imgSrc', 'fontSrc']

const sourcesFor = (additions: ContentSecurityPolicyAdditions) =>
  Object.fromEntries(
    ADDITION_KEYS.map((key) => [
      key,
      [...(SELF_BY_DEFAULT.includes(key) ? SELF : []), ...(additions[key] ?? [])]
    ]).filter(([, sources]) => sources!.length > 0)
  )

const headersFor = (
  additions: ContentSecurityPolicyAdditions,
  frameAncestors: string[],
  xFrameOptions: 'DENY' | false,
  resourcePolicy: 'same-origin' | 'cross-origin' = 'same-origin'
) =>
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: NONE,
      baseUri: NONE,
      formAction: SELF,
      ...sourcesFor(additions),
      frameAncestors
    },
    xFrameOptions,
    crossOriginResourcePolicy: resourcePolicy,
    permissionsPolicy: { camera: [], geolocation: [], microphone: [], payment: [], usb: [] }
  })

const isPreviewPath = (path: string) => path.startsWith(`${BLOCK_PREVIEW.path}/`)

const isThumbnailPath = (path: string) =>
  isPreviewPath(path) && path.endsWith(`/${BLOCK_PREVIEW.thumbnailFile}`)

export const securityHeaders = (additions: ContentSecurityPolicyAdditions = {}) => {
  const denyFraming = headersFor(additions, NONE, 'DENY')
  return createMiddleware<{ Bindings: SiteEnv }>((c, next) => {
    const adminOrigin = c.env.ADMIN_ORIGIN
    if (!isPreviewPath(c.req.path) || !adminOrigin) return denyFraming(c, next)
    const resourcePolicy = isThumbnailPath(c.req.path) ? 'cross-origin' : 'same-origin'
    return headersFor(additions, [adminOrigin], false, resourcePolicy)(c, next)
  })
}
