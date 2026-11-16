import { createFileRoute } from '@tanstack/react-router'

import { collectionsQuery, entriesQuery, entryQuery } from '@/features/collections/queries'
import { EntryEditor } from '@/features/entry-editor/entry-editor'

function EditEntryRoute() {
  const { name, entryId } = Route.useParams()
  return <EntryEditor key={entryId} name={name} entryId={entryId} />
}

export const Route = createFileRoute('/collections_/$name/$entryId')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(collectionsQuery),
      context.queryClient.ensureQueryData(entriesQuery(params.name)),
      context.queryClient.ensureQueryData(entryQuery(params.name, params.entryId))
    ]),
  staticData: { title: 'nav.sections.collections.title', width: 'wide' },
  component: EditEntryRoute
})
