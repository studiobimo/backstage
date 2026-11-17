import { createMiddleware } from 'hono/factory'

import { PAGE_PREVIEW } from '../page-preview.ts'
import { SITE_VERSION } from '../publishing.ts'
import type { AdminEnv } from './env.ts'
import { bumpSiteVersion } from './snapshots.ts'

const REPUBLISH_PATH = '/republish'

const isPublishedKey = (key: string) =>
  key !== SITE_VERSION.key &&
  !key.startsWith(`${PAGE_PREVIEW.key.prefix}${PAGE_PREVIEW.key.separator}`)

const WRITING_METHODS = new Set<string | symbol>(['put', 'delete'])

const trackingWrites = (kv: KVNamespace, onPublishedWrite: () => void): KVNamespace =>
  new Proxy(kv, {
    get: (target, property) => {
      const member = Reflect.get(target, property)
      if (typeof member !== 'function') return member
      return (key: string, ...rest: unknown[]) => {
        if (WRITING_METHODS.has(property) && isPublishedKey(key)) onPublishedWrite()
        return Reflect.apply(member, target, [key, ...rest])
      }
    }
  })

export const bumpSiteVersionOnPublish = createMiddleware<{ Bindings: AdminEnv }>(
  async (c, next) => {
    if (c.req.method === 'GET' || c.req.path.endsWith(REPUBLISH_PATH)) return next()
    const original = c.env.SITE
    let wrote = false
    c.env = { ...c.env, SITE: trackingWrites(original, () => (wrote = true)) }
    await next()
    if (wrote && c.res.ok) await bumpSiteVersion(original)
  }
)
