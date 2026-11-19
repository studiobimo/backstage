import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '@/features/home/home-page'
import { pagesQuery } from '@/features/pages/queries'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(pagesQuery),
  staticData: { title: 'nav.home' },
  component: HomePage
})
