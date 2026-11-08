import { layoutsResponseSchema, pageBlocksSchema, type PageBlock } from '@studiobimo/backstage'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiRequest } from '@/lib/api'

import type { JsonSchema } from '../block-form/spec'

const blockDescriptionsSchema = z.object({
  blocks: z.array(
    z.object({ name: z.string(), version: z.number(), schema: z.custom<JsonSchema>() })
  )
})

export const blockDescriptionsQuery = queryOptions({
  queryKey: ['blocks'],
  queryFn: async () =>
    blockDescriptionsSchema.parse(await (await apiRequest('/blocks')).json()).blocks
})

const pageBlocksKey = (pageId: string) => ['page-blocks', pageId] as const

export const pageBlocksQuery = (pageId: string) =>
  queryOptions({
    queryKey: pageBlocksKey(pageId),
    queryFn: async () =>
      pageBlocksSchema.parse(await (await apiRequest(`/pages/${pageId}/blocks`)).json()).blocks
  })

export const savePageBlocksMutation = (queryClient: QueryClient, pageId: string) =>
  mutationOptions({
    mutationFn: async (blocks: PageBlock[]) =>
      pageBlocksSchema.parse(
        await (
          await apiRequest(`/pages/${pageId}/blocks`, {
            method: 'PUT',
            body: JSON.stringify({ blocks })
          })
        ).json()
      ).blocks,
    onSuccess: (blocks) => {
      queryClient.setQueryData(pageBlocksKey(pageId), blocks)
      return queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
    }
  })

export const layoutsQuery = queryOptions({
  queryKey: ['layouts'],
  queryFn: async () =>
    layoutsResponseSchema.parse(await (await apiRequest('/layouts')).json()).layouts
})

export const savePageLayoutMutation = (queryClient: QueryClient, pageId: string) =>
  mutationOptions({
    mutationFn: async (layout: string) => {
      await apiRequest(`/pages/${pageId}/layout`, {
        method: 'PUT',
        body: JSON.stringify({ layout })
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
  })
