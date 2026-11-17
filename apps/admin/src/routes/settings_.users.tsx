import { createFileRoute } from '@tanstack/react-router'

import { currentUserQuery, usersQuery } from '@/features/users/queries'
import { UsersPage } from '@/features/users/users-page'

export const Route = createFileRoute('/settings_/users')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(usersQuery),
      context.queryClient.ensureQueryData(currentUserQuery)
    ])
  },
  staticData: { title: 'nav.sections.settings.items.users' },
  component: UsersPage
})
