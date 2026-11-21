import { inboxFilterSchema } from '@studiobimo/backstage/internal'
import { createFileRoute } from '@tanstack/react-router'

import i18n from '@/i18n/config'
import { configQuery } from '@/features/config/queries'
import { formsQuery, submissionsQuery } from '@/features/forms/queries'
import { SubmissionsPage } from '@/features/forms/submissions-page'

function SubmissionsRoute() {
  const { name } = Route.useParams()
  const filter = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <SubmissionsPage
      key={name}
      name={name}
      filter={filter}
      onFilterChange={(next) => void navigate({ search: next, replace: true })}
    />
  )
}

export const Route = createFileRoute('/forms/$name')({
  validateSearch: (search) => {
    const parsed = inboxFilterSchema.safeParse(search)
    return parsed.success ? parsed.data : {}
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(configQuery),
      context.queryClient.ensureQueryData(formsQuery),
      context.queryClient.ensureQueryData(submissionsQuery(params.name, deps, i18n.language))
    ]),
  staticData: { title: 'nav.sections.forms.title', width: 'wide' },
  component: SubmissionsRoute
})
