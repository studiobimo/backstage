import type { submissionsResponseSchema } from '@studiobimo/backstage/internal'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { InboxIcon, SearchXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'

import { CardTable } from '@/components/card-table'
import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'

import { localizedText } from '../page-editor/localized-text'
import { useLocaleConfig } from '../config/queries'
import { formTitle } from './form-text'
import { formsQuery, submissionsQuery, type FormOption, type SubmissionFilter } from './queries'
import { SubmissionsPager } from './submissions-pager'
import { StatusBadge } from './status-badge'
import { SubmissionsFilters } from './submissions-filters'
import { useLocalizedForm } from './use-localized-form'

const COLUMN_VISIBILITY = ['', '', 'hidden sm:table-cell', 'hidden md:table-cell'] as const
const RECEIVED_VISIBILITY = 'hidden lg:table-cell'

const withoutPage = (filter: SubmissionFilter): SubmissionFilter => ({ ...filter, page: undefined })

const visibilityOf = (index: number) => COLUMN_VISIBILITY[index] ?? ''

type Listing = z.infer<typeof submissionsResponseSchema>

function SubmissionRow({
  form,
  submission
}: {
  form: FormOption
  submission: Listing['submissions'][number]
}) {
  const { t, i18n } = useTranslation('forms')
  return (
    <TableRow>
      {submission.cells.map((text, index) => (
        <TableCell
          key={index}
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
      ))}
      <TableCell className={`${RECEIVED_VISIBILITY} text-muted-foreground`}>
        {formatDateTime(i18n.language, submission.createdAt)}
      </TableCell>
      <TableCell>
        <StatusBadge status={submission.status} />
      </TableCell>
    </TableRow>
  )
}

function SubmissionsTable({ form, listing }: { form: FormOption; listing: Listing }) {
  const { t } = useTranslation('forms')
  return (
    <CardTable
      head={
        <>
          {listing.columns.map(({ key, label }, index) => (
            <TableHead key={key} className={visibilityOf(index)}>
              {label}
            </TableHead>
          ))}
          <TableHead className={RECEIVED_VISIBILITY}>{t('list.columns.received')}</TableHead>
          <TableHead>{t('list.columns.status')}</TableHead>
        </>
      }
    >
      {listing.submissions.map((submission) => (
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
  const { data: listing, isPending } = useQuery(submissionsQuery(name, filter, i18n.language))
  const form = useLocalizedForm(forms.find((candidate) => candidate.name === name))
  if (!form) return <ListNotice title={t('missing.title')} description={t('missing.description')} />
  const filtered = Boolean(filter.status || filter.from || filter.to)
  return (
    <>
      <PageHeader
        title={formTitle(form, i18n.language, defaultLocale)}
        description={localizedText(form.description, i18n.language, defaultLocale)}
      />
      <SubmissionsFilters
        form={form}
        filter={filter}
        onChange={(next) => onFilterChange(withoutPage(next))}
      />
      {isPending ? null : listing?.submissions.length ? (
        <>
          <SubmissionsTable form={form} listing={listing} />
          <SubmissionsPager
            listing={listing}
            onPageChange={(page) => onFilterChange({ ...filter, page })}
          />
        </>
      ) : filtered ? (
        <ListNotice
          icon={<SearchXIcon />}
          title={t('list.noMatchTitle')}
          description={t('list.noMatchDescription')}
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
