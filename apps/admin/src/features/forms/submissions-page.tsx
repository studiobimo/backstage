import type { InboxSubmission } from '@studiobimo/backstage/internal'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { InboxIcon, SearchXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CardTable } from '@/components/card-table'
import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'

import { localizedText } from '../page-editor/localized-text'
import { useLocaleConfig } from '../config/queries'
import { cellText, columnsOf, fieldLabel, formTitle } from './form-text'
import { formsQuery, submissionsQuery, type FormOption, type SubmissionFilter } from './queries'
import { StatusBadge } from './status-badge'
import { SubmissionsFilters } from './submissions-filters'
import { useLocalizedForm } from './use-localized-form'

const COLUMN_VISIBILITY = ['', '', 'hidden sm:table-cell', 'hidden md:table-cell'] as const
const RECEIVED_VISIBILITY = 'hidden lg:table-cell'

const visibilityOf = (index: number) => COLUMN_VISIBILITY[index] ?? ''

function SubmissionRow({ form, submission }: { form: FormOption; submission: InboxSubmission }) {
  const { t, i18n } = useTranslation('forms')
  const columns = columnsOf(form.schema)
  return (
    <TableRow>
      {columns.map(([key, node], index) => {
        const text = cellText(node, submission.payload[key], i18n.language)
        return (
          <TableCell
            key={key}
            className={`${visibilityOf(index)} ${index === 0 ? 'font-medium' : 'text-muted-foreground'}`}
          >
            {index === 0 ? (
              <Link
                to="/forms/$name/$submissionId"
                params={{ name: form.name, submissionId: submission.id }}
                className="rounded-sm py-0.5 outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {text || t('detail.none')}
              </Link>
            ) : (
              text
            )}
          </TableCell>
        )
      })}
      <TableCell className={`${RECEIVED_VISIBILITY} text-muted-foreground`}>
        {formatDateTime(i18n.language, submission.createdAt)}
      </TableCell>
      <TableCell>
        <StatusBadge status={submission.status} />
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
          {columnsOf(form.schema).map(([key, node], index) => (
            <TableHead key={key} className={visibilityOf(index)}>
              {fieldLabel(key, node)}
            </TableHead>
          ))}
          <TableHead className={RECEIVED_VISIBILITY}>{t('list.columns.received')}</TableHead>
          <TableHead>{t('list.columns.status')}</TableHead>
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
  const form = useLocalizedForm(forms.find((candidate) => candidate.name === name))
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
        <ListNotice
          icon={<SearchXIcon />}
          title={t('list.noMatchTitle')}
          description={t('list.noMatchDescription')}
          action={
            <Button variant="outline" onClick={() => onFilterChange({})}>
              {t('filters.clear')}
            </Button>
          }
        />
      ) : (
        <ListNotice
          icon={<InboxIcon />}
          title={t('list.emptyTitle')}
          description={t('list.emptyDescription')}
        />
      )}
    </>
  )
}
