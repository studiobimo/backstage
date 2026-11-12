import { createFileRoute } from '@tanstack/react-router'

import { PageEditor } from '@/features/page-editor/page-editor'
import { blockDescriptionsQuery, pageBlocksQuery } from '@/features/page-editor/queries'
import { pagesQuery } from '@/features/pages/queries'

export const Route = createFileRoute('/pages_/$pageId')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(pagesQuery),
      context.queryClient.ensureQueryData(blockDescriptionsQuery),
      context.queryClient.ensureQueryData(pageBlocksQuery(params.pageId))
    ]),
  staticData: { title: 'pageEditor:title', width: 'wide' },
  component: EditorRoute
})

function EditorRoute() {
  const { pageId } = Route.useParams()
  return <PageEditor key={pageId} pageId={pageId} />
}
