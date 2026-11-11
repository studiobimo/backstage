import { siteOriginResponseSchema } from '@studiobimo/backstage'
import { queryOptions } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

export const siteOriginQuery = queryOptions({
  queryKey: ['site-origin'],
  staleTime: Infinity,
  queryFn: async () =>
    siteOriginResponseSchema.parse(await (await apiRequest('/site-origin')).json()).origin
})
