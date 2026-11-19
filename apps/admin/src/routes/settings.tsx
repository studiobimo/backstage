import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/features/settings/settings-page'
import {
  registrySettingsQuery,
  settingsQuery,
  sitePublicationQuery,
  slotsQuery
} from '@/features/settings/queries'

export const Route = createFileRoute('/settings')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(registrySettingsQuery),
      context.queryClient.ensureQueryData(slotsQuery),
      context.queryClient.ensureQueryData(sitePublicationQuery)
    ])
  },
  staticData: { title: 'nav.sections.settings.title' },
  component: SettingsPage
})
