import type { Context } from 'hono'

const CSP_HEADER = 'Content-Security-Policy'

export const siteOriginOf = (env: Pick<Env, 'SITE_ORIGIN'>) => {
  try {
    return new URL(env.SITE_ORIGIN).origin
  } catch {
    return null
  }
}

const IMG_SRC = 'img-src'

const allowFrames = (policy: string, origin: string) => `${policy}; frame-src ${origin}`

const allowImages = (policy: string, origin: string) => {
  const directives = policy.split(';').map((directive) => directive.trim())
  const index = directives.findIndex((directive) => directive.startsWith(`${IMG_SRC} `))
  if (index === -1) return `${policy}; ${IMG_SRC} ${origin}`
  directives[index] = `${directives[index]} ${origin}`
  return directives.join('; ')
}

const allowSite = (policy: string, origin: string | null) =>
  origin ? allowImages(allowFrames(policy, origin), origin) : policy

export async function serveSpa(c: Context<{ Bindings: Env }>) {
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  const policy = asset.headers.get(CSP_HEADER)
  if (!policy) return asset
  const headers = new Headers(asset.headers)
  headers.set(CSP_HEADER, allowSite(policy, siteOriginOf(c.env)))
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers })
}
