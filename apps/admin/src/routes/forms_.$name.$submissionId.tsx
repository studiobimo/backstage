import { createFileRoute } from '@tanstack/react-router'

import i18n from '@/i18n/config'
import { configQuery } from '@/features/config/queries'
import { formsQuery, submissionQuery } from '@/features/forms/queries'
import { SubmissionPage } from '@/features/forms/submission-page'

function SubmissionRoute() {
  const { name, submissionId } = Route.useParams()
  return <SubmissionPage key={submissionId} name={name} submissionId={submissionId} />
}

export const Route = createFileRoute('/forms_/$name/$submissionId')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(configQuery),
      context.queryClient.ensureQueryData(formsQuery),
      context.queryClient.ensureQueryData(
        submissionQuery(params.name, params.submissionId, i18n.language)
      )
    ]),
  staticData: { title: 'nav.sections.forms.title', width: 'wide' },
  component: SubmissionRoute
})
