import type { InboxSubmission } from '@studiobimo/backstage/internal'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CardTable } from '@/components/card-table'
import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'

import { localizedText } from '../page-editor/localized-text'
import { useLocaleConfig } from '../config/queries'
import { formTitle, summaryOf } from './form-text'
import { formsQuery, submissionsQuery, type FormOption, type SubmissionFilter } from './queries'
import { StatusBadge } from './status-badge'
import { SubmissionsFilters } from './submissions-filters'

const SECONDARY_COLUMN = 'hidden md:table-cell'

function SubmissionRow({ form, submission }: { form: FormOption; submission: InboxSubmission }) {
  const { t, i18n } = useTranslation('forms')
  const summary = summaryOf(form.schema, submission.payload, i18n.language) || t('detail.none')
  return (
    <TableRow>
      <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-none">
        <Link
          to="/forms/$name/$submissionId"
          params={{ name: form.name, submissionId: submission.id }}
          className="block truncate rounded-sm py-0.5 font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {summary}
        </Link>
      </TableCell>
      <TableCell>
        <StatusBadge status={submission.status} />
      </TableCell>
      <TableCell className={`${SECONDARY_COLUMN} text-muted-foreground`}>
        {formatDateTime(i18n.language, submission.createdAt)}
      </TableCell>
    </TableRow>
  )
}

function SubmissionsTable({
  form,
  submissions
}: {
  form: FormOption
  submissions: InboxSubmission[]
}) {
  const { t } = useTranslation('forms')
  return (
    <CardTable
      head={
        <>
          <TableHead>{t('list.columns.details')}</TableHead>
          <TableHead>{t('list.columns.status')}</TableHead>
          <TableHead className={SECONDARY_COLUMN}>{t('list.columns.received')}</TableHead>
        </>
      }
    >
      {submissions.map((submission) => (
        <SubmissionRow key={submission.id} form={form} submission={submission} />
      ))}
    </CardTable>
  )
}

interface SubmissionsPageProps {
  name: string
  filter: SubmissionFilter
  onFilterChange: (filter: SubmissionFilter) => void
}

export function SubmissionsPage({ name, filter, onFilterChange }: SubmissionsPageProps) {
  const { t, i18n } = useTranslation('forms')
  const { defaultLocale } = useLocaleConfig()
  const { data: forms } = useSuspenseQuery(formsQuery)
  const { data: submissions, isPending } = useQuery(submissionsQuery(name, filter))
  const form = forms.find((candidate) => candidate.name === name)
  if (!form) return <ListNotice title={t('missing.title')} description={t('missing.description')} />
  const filtered = Boolean(filter.status || filter.from || filter.to)
  return (
    <>
      <PageHeader
        title={formTitle(form, i18n.language, defaultLocale)}
        description={localizedText(form.description, i18n.language, defaultLocale)}
      />
      <SubmissionsFilters form={form} filter={filter} onChange={onFilterChange} />
      {isPending ? null : submissions?.length ? (
        <SubmissionsTable form={form} submissions={submissions} />
      ) : filtered ? (
        <ListNotice title={t('list.noMatchTitle')} description={t('list.noMatchDescription')} />
      ) : (
        <ListNotice title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
      )}
    </>
  )
}
