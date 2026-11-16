import { createFileRoute } from '@tanstack/react-router'

import { collectionsQuery } from '@/features/collections/queries'
import { EntryEditor } from '@/features/entry-editor/entry-editor'

function NewEntryRoute() {
  const { name } = Route.useParams()
  return <EntryEditor key={name} name={name} />
}

export const Route = createFileRoute('/collections_/$name/new')({
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQuery),
  staticData: { title: 'nav.sections.collections.title', width: 'wide' },
  component: NewEntryRoute
})
