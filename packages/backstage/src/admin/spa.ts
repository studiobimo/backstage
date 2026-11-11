import type { Context } from 'hono'

const CSP_HEADER = 'Content-Security-Policy'

export const siteOriginOf = (env: Pick<Env, 'SITE_ORIGIN'>) => {
  try {
    return new URL(env.SITE_ORIGIN).origin
  } catch {
    return null
  }
}

const allowFrames = (policy: string, origin: string | null) =>
  origin ? `${policy}; frame-src ${origin}` : policy

export async function serveSpa(c: Context<{ Bindings: Env }>) {
  const asset = await c.env.ASSETS.fetch(c.req.raw)
  const policy = asset.headers.get(CSP_HEADER)
  if (!policy) return asset
  const headers = new Headers(asset.headers)
  headers.set(CSP_HEADER, allowFrames(policy, siteOriginOf(c.env)))
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers })
}
