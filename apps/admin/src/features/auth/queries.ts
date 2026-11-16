import { API_ERROR } from '@studiobimo/backstage'
import {
  AUTH,
  authSessionResponseSchema,
  requestLinkSchema,
  verifyLinkSchema,
  type RequestLinkInput
} from '@studiobimo/backstage/internal'
import { mutationOptions, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

import { API_ROOT, ApiError, apiRequest } from '@/lib/api'

const authRequest = (path: string, init?: RequestInit) => apiRequest(path, init, API_ROOT.auth)

const postJson = (path: string, body: unknown) =>
  authRequest(path, { method: 'POST', body: JSON.stringify(body) })

export const authSessionQuery = queryOptions({
  queryKey: ['auth', 'session'],
  staleTime: Infinity,
  queryFn: async () =>
    authSessionResponseSchema.parse(await (await authRequest(AUTH.paths.session)).json())
})

export const requestLinkMutation = mutationOptions({
  mutationFn: (input: RequestLinkInput) =>
    postJson(AUTH.paths.requestLink, requestLinkSchema.parse(input))
})

export const verifyLinkMutation = mutationOptions({
  mutationFn: (input: z.input<typeof verifyLinkSchema>) =>
    postJson(AUTH.paths.verify, verifyLinkSchema.parse(input))
})

export const signOutMutation = mutationOptions({
  mutationFn: () => postJson(AUTH.paths.logout, {})
})

export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && error.code === API_ERROR.unauthorized.code
