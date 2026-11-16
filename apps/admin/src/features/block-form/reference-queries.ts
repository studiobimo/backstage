import { entriesResponseSchema, type EntrySummary } from '@studiobimo/backstage/internal'
import { queryOptions } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

export const referenceEntriesQuery = (collection: string) =>
  queryOptions({
    queryKey: ['entry-reference', collection],
    queryFn: async () =>
      entriesResponseSchema.parse(
        await (await apiRequest(`/collections/${encodeURIComponent(collection)}/entries`)).json()
      ).entries
  })

export const entryLabelOf = (
  { label }: Pick<EntrySummary, 'label'>,
  active: string,
  fallback: string
) => label[active] || label[fallback] || Object.values(label).find(Boolean) || ''
