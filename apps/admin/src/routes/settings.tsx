import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/features/settings/settings-page'
import { settingsQuery, slotsQuery } from '@/features/settings/queries'

export const Route = createFileRoute('/settings')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(slotsQuery)
    ])
  },
  staticData: { title: 'nav.sections.settings.title' },
  component: SettingsPage
})
