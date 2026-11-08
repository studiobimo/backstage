import { getPlatformProxy } from 'wrangler'

export const openTestEnv = async () => {
  const platform = await getPlatformProxy<Env>({ persist: false })
  return {
    dispose: () => platform.dispose(),
    db: platform.env.DB!,
    env: {
      localDevelopment: { ...platform.env, DEV_AUTH: 'true' },
      deployed: { ...platform.env, DEV_AUTH: '' }
    }
  }
}
