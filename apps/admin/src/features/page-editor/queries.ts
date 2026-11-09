import {
  layoutsResponseSchema,
  pageBlocksResponseSchema,
  pageSchema,
  pageSeoResponseSchema,
  type PageBlock,
  type PageBlocksResponse,
  type PageSeo,
  type PageSeoResponse
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

export const pageBlocksKey = (pageId: string) => ['page-blocks', pageId] as const

export const pageBlocksQuery = (pageId: string) =>
  queryOptions({
    queryKey: pageBlocksKey(pageId),
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () =>
      pageBlocksResponseSchema.parse(await (await apiRequest(`/pages/${pageId}/blocks`)).json())
  })

export const savePageBlocksMutation = (queryClient: QueryClient, pageId: string) =>
  mutationOptions({
    mutationFn: async (save: { blocks: PageBlock[]; expectedVersion: number }) =>
      pageBlocksResponseSchema.parse(
        await (
          await apiRequest(`/pages/${pageId}/blocks`, {
            method: 'PUT',
            body: JSON.stringify(save)
          })
        ).json()
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(pageBlocksKey(pageId), saved)
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
    mutationFn: async (save: { layout: string; expectedVersion: number }) =>
      z.object({ page: pageSchema }).parse(
        await (
          await apiRequest(`/pages/${pageId}/layout`, {
            method: 'PUT',
            body: JSON.stringify(save)
          })
        ).json()
      ).page,
    onSuccess: (page) => {
      queryClient.setQueryData<PageBlocksResponse>(
        pageBlocksKey(pageId),
        (current) => current && { ...current, version: page.version, layout: page.layout }
      )
      return queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
    }
  })

export const pageSeoKey = (pageId: string) => ['page-seo', pageId] as const

const readSeo = async (response: Response) => pageSeoResponseSchema.parse(await response.json())

export const pageSeoQuery = (pageId: string) =>
  queryOptions({
    queryKey: pageSeoKey(pageId),
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => readSeo(await apiRequest(`/pages/${pageId}/seo`))
  })

export const savePageSeoMutation = (queryClient: QueryClient, pageId: string) =>
  mutationOptions({
    mutationFn: async (save: { seo: PageSeo; expectedVersion: number }) =>
      readSeo(
        await apiRequest(`/pages/${pageId}/seo`, {
          method: 'PUT',
          body: JSON.stringify({ ...save.seo, expectedVersion: save.expectedVersion })
        })
      ),
    onSuccess: (saved: PageSeoResponse) => {
      queryClient.setQueryData(pageSeoKey(pageId), saved)
      queryClient.setQueryData<PageBlocksResponse>(
        pageBlocksKey(pageId),
        (current) => current && { ...current, version: saved.version }
      )
      return queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
    }
  })
