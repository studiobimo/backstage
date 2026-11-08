import { siteSettingsResponseSchema, type SiteSettings } from '@studiobimo/backstage'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

const SETTINGS_API = { path: '/settings', queryKey: ['settings'] } as const

const readSettings = async (response: Response) =>
  siteSettingsResponseSchema.parse(await response.json()).settings

export const settingsQuery = queryOptions({
  queryKey: SETTINGS_API.queryKey,
  queryFn: async () => readSettings(await apiRequest(SETTINGS_API.path))
})

export const saveSettingsMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (settings: SiteSettings) =>
      readSettings(
        await apiRequest(SETTINGS_API.path, { method: 'PUT', body: JSON.stringify(settings) })
      ),
    onSuccess: (settings) => queryClient.setQueryData(SETTINGS_API.queryKey, settings)
  })
