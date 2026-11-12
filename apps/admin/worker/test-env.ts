import type { AdminEnv } from '@studiobimo/backstage/admin'
import { getPlatformProxy } from 'wrangler'

const noAssets = { fetch: async () => new Response(null, { status: 404 }) } as unknown as Fetcher

export const openTestEnv = async () => {
  const platform = await getPlatformProxy<AdminEnv>({ persist: false })
  const bindings = { ...platform.env, ASSETS: platform.env.ASSETS ?? noAssets }
  return {
    dispose: () => platform.dispose(),
    db: platform.env.DB,
    env: {
      localDevelopment: { ...bindings, DEV_AUTH: 'true' },
      deployed: { ...bindings, DEV_AUTH: '' }
    }
  }
}
