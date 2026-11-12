import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { pageSchema, pagesResponseSchema, type PageInput } from '@studiobimo/backstage'

import { apiRequest } from '@/lib/api'

const PAGES_QUERY_KEY = ['pages'] as const

const request = (path: string, init?: RequestInit) => apiRequest(`/pages${path}`, init)

export const pagesQuery = queryOptions({
  queryKey: PAGES_QUERY_KEY,
  queryFn: async () => pagesResponseSchema.parse(await (await request('')).json()).pages
})

const refresh = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY })

const body = (input: object) => JSON.stringify(input)

export const createPageMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (input: PageInput) =>
      pageSchema.parse(
        (
          (await (await request('', { method: 'POST', body: body(input) })).json()) as {
            page: unknown
          }
        ).page
      ),
    onSuccess: () => refresh(queryClient)
  })

export const renamePageMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async ({
      id,
      input,
      expectedVersion
    }: {
      id: string
      input: PageInput
      expectedVersion: number
    }) => {
      await request(`/${id}`, { method: 'PUT', body: body({ ...input, expectedVersion }) })
    },
    onSuccess: () => refresh(queryClient)
  })

export const deletePageMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (id: string) => {
      await request(`/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => refresh(queryClient)
  })
