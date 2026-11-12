import type { LocaleConfig } from '@studiobimo/backstage'
import { QueryClient } from '@tanstack/react-query'

import { configQuery } from '@/features/config/queries'

export const DEFAULT_TEST_CONFIG: LocaleConfig = { locales: ['en', 'es'], defaultLocale: 'en' }

export const testQueryClient = (config: LocaleConfig = DEFAULT_TEST_CONFIG) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(configQuery.queryKey, { ...config, locales: [...config.locales] })
  return client
}
