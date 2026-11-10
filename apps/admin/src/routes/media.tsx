import { createFileRoute } from '@tanstack/react-router'

import { MediaPage } from '@/features/media/media-page'

export const Route = createFileRoute('/media')({
  staticData: { width: 'wide' },
  component: MediaPage
})
