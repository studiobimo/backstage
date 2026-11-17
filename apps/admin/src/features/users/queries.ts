import {
  currentUserSchema,
  inviteUserSchema,
  ROLE,
  usersResponseSchema,
  type InviteUserInput,
  type Role
} from '@studiobimo/backstage/internal'
import { mutationOptions, queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

const USERS_API = { path: '/users', queryKey: ['users'], mePath: '/users/me' } as const

export const usersQuery = queryOptions({
  queryKey: USERS_API.queryKey,
  queryFn: async () =>
    usersResponseSchema.parse(await (await apiRequest(USERS_API.path)).json()).users
})

export const currentUserQuery = queryOptions({
  queryKey: [...USERS_API.queryKey, 'me'],
  staleTime: Infinity,
  queryFn: async () => currentUserSchema.parse(await (await apiRequest(USERS_API.mePath)).json())
})

export function useIsOwner() {
  const { data } = useQuery(currentUserQuery)
  return data?.role === ROLE.owner
}

const refresh = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: USERS_API.queryKey })

export const inviteUserMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (input: InviteUserInput) => {
      await apiRequest(USERS_API.path, {
        method: 'POST',
        body: JSON.stringify(inviteUserSchema.parse(input))
      })
    },
    onSuccess: () => refresh(queryClient)
  })

export const changeRoleMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      await apiRequest(`${USERS_API.path}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      })
    },
    onSuccess: () => refresh(queryClient)
  })

export const removeUserMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (id: string) => {
      await apiRequest(`${USERS_API.path}/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => refresh(queryClient)
  })
