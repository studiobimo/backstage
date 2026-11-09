import { createFileRoute } from '@tanstack/react-router'

import { PagesPage } from '@/features/pages/pages-page'
import { pagesQuery } from '@/features/pages/queries'

export const Route = createFileRoute('/pages')({
  loader: ({ context }) => context.queryClient.ensureQueryData(pagesQuery),
  staticData: { width: 'wide' },
  component: PagesPage
})
