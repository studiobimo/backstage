import { hasMultipleLocales, localeConfigSchema } from '@studiobimo/backstage'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

export const configQuery = queryOptions({
  queryKey: ['config'],
  staleTime: Infinity,
  queryFn: async () => localeConfigSchema.parse(await (await apiRequest('/config')).json())
})

export function useLocaleConfig() {
  const { data } = useSuspenseQuery(configQuery)
  return { ...data, hasMultipleLocales: hasMultipleLocales(data) }
}
