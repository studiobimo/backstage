import {
  republishBatchSchema,
  republishStatusResponseSchema,
  type RepublishScope
} from '@studiobimo/backstage/internal'
import { queryOptions } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

const REPUBLISH_API = { path: '/republish', queryKey: ['republish'] } as const

const statusPath = ({ since, cursor }: RepublishScope) => {
  const params = new URLSearchParams()
  if (since !== null) params.set('since', String(since))
  if (cursor !== null) params.set('cursor', cursor)
  const query = params.toString()
  return query ? `${REPUBLISH_API.path}?${query}` : REPUBLISH_API.path
}

export const republishStatusQuery = (scope: RepublishScope, enabled: boolean) =>
  queryOptions({
    queryKey: [...REPUBLISH_API.queryKey, scope],
    queryFn: async () =>
      republishStatusResponseSchema.parse(await (await apiRequest(statusPath(scope))).json())
        .status,
    enabled,
    staleTime: 0,
    gcTime: 0
  })

export const republishNextBatch = async (scope: RepublishScope) =>
  republishBatchSchema.parse(
    await (
      await apiRequest(REPUBLISH_API.path, { method: 'POST', body: JSON.stringify(scope) })
    ).json()
  )
