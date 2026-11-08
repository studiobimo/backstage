import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { API_ERROR, pageSchema, pagesResponseSchema, type PageInput } from '@studiobimo/backstage'
import { z } from 'zod'

const PAGES_API = { path: '/api/v1/pages', queryKey: ['pages'] } as const

export class PagesApiError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const failureShape = z.object({ error: z.string(), code: z.string() })

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${PAGES_API.path}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' }
  })
  if (response.ok) return response
  const failure = failureShape.safeParse(await response.json().catch(() => null))
  const { code, error } = failure.success
    ? failure.data
    : { code: API_ERROR.internal.code, error: API_ERROR.internal.message }
  throw new PagesApiError(code, error)
}

export const pagesQuery = queryOptions({
  queryKey: PAGES_API.queryKey,
  queryFn: async () => pagesResponseSchema.parse(await (await request('')).json()).pages
})

const refresh = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: PAGES_API.queryKey })

const body = (input: PageInput) => JSON.stringify(input)

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
    mutationFn: async ({ id, input }: { id: string; input: PageInput }) => {
      await request(`/${id}`, { method: 'PUT', body: body(input) })
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
