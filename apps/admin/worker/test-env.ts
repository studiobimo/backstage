import type { AdminEnv } from '@studiobimo/backstage/admin'
import { getPlatformProxy } from 'wrangler'

import { migrationStatements } from '../../../packages/backstage/test/migrations'

const noAssets = { fetch: async () => new Response(null, { status: 404 }) } as unknown as Fetcher

export const openTestEnv = async () => {
  const platform = await getPlatformProxy<AdminEnv>({ persist: false })
  const bindings = { ...platform.env, ASSETS: platform.env.ASSETS ?? noAssets }
  const db = platform.env.DB
  await db.batch(migrationStatements().map((statement) => db.prepare(statement)))
  return {
    dispose: () => platform.dispose(),
    db,
    env: {
      localDevelopment: { ...bindings, DEV_AUTH: 'true' },
      deployed: { ...bindings, DEV_AUTH: '' }
    }
  }
}
