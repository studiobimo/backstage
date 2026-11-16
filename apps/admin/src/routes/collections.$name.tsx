import { createFileRoute } from '@tanstack/react-router'

import { EntriesPage } from '@/features/collections/entries-page'
import { collectionsQuery, entriesQuery } from '@/features/collections/queries'

function EntriesRoute() {
  const { name } = Route.useParams()
  return <EntriesPage key={name} name={name} />
}

export const Route = createFileRoute('/collections/$name')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(collectionsQuery),
      context.queryClient.ensureQueryData(entriesQuery(params.name))
    ]),
  staticData: { title: 'nav.sections.collections.title', width: 'wide' },
  component: EntriesRoute
})
