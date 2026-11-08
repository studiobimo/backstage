import {
  siteSettingsResponseSchema,
  slotResponseSchema,
  slotsResponseSchema,
  type SiteBlock,
  type SiteSettings,
  type Slot
} from '@studiobimo/backstage'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

import type { BlockOption } from '../page-editor/draft'

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

const SLOTS_API = { path: '/slots', queryKey: ['slots'] } as const

export type SlotView = Omit<Slot, 'blocks'> & { blocks: BlockOption[] }

const readSlots = async (response: Response) =>
  slotsResponseSchema.parse(await response.json()).slots as SlotView[]

export const slotsQuery = queryOptions({
  queryKey: SLOTS_API.queryKey,
  queryFn: async () => readSlots(await apiRequest(SLOTS_API.path))
})

export const saveSlotMutation = (queryClient: QueryClient, slotName: string) =>
  mutationOptions({
    mutationFn: async (block: SiteBlock) =>
      slotResponseSchema.parse(
        await (
          await apiRequest(`${SLOTS_API.path}/${slotName}`, {
            method: 'PUT',
            body: JSON.stringify(block)
          })
        ).json()
      ).slot as SlotView,
    onSuccess: (saved) =>
      queryClient.setQueryData<SlotView[]>(SLOTS_API.queryKey, (slots) =>
        slots?.map((slot) => (slot.name === saved.name ? saved : slot))
      )
  })
