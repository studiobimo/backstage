import {
  layoutsResponseSchema,
  pageBlocksSchema,
  pageSeoResponseSchema,
  type PageBlock,
  type PageSeo
} from '@studiobimo/backstage'
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

const pageSeoKey = (pageId: string) => ['page-seo', pageId] as const

const readSeo = async (response: Response) => pageSeoResponseSchema.parse(await response.json()).seo

export const pageSeoQuery = (pageId: string) =>
  queryOptions({
    queryKey: pageSeoKey(pageId),
    queryFn: async () => readSeo(await apiRequest(`/pages/${pageId}/seo`))
  })

export const savePageSeoMutation = (queryClient: QueryClient, pageId: string) =>
  mutationOptions({
    mutationFn: async (seo: PageSeo) =>
      readSeo(
        await apiRequest(`/pages/${pageId}/seo`, { method: 'PUT', body: JSON.stringify(seo) })
      ),
    onSuccess: (seo) => {
      queryClient.setQueryData(pageSeoKey(pageId), seo)
      return queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
    }
  })
