import { createFileRoute } from '@tanstack/react-router'

import { BlockPreviewPage } from '@/features/block-preview/block-preview-page'
import { siteOriginQuery } from '@/features/block-preview/queries'
import { blockDescriptionsQuery } from '@/features/page-editor/queries'

export const Route = createFileRoute('/blocks')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(blockDescriptionsQuery),
      context.queryClient.ensureQueryData(siteOriginQuery)
    ]),
  component: BlockPreviewPage
})
