import type { InboxSubmission } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FrameSection } from '@/components/frame-section'
import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { toastManager } from '@/components/ui/toast'
import { useApiErrorMessage } from '@/lib/api-feedback'
import { formatDateTime } from '@/lib/format'

import { useLocaleConfig } from '../config/queries'
import { FieldValue } from './field-value'
import { fieldEntries, fieldLabel, formTitle, statusLabel } from './form-text'
import { changeStatusMutation, formsQuery, submissionQuery, type FormOption } from './queries'
import { StatusBadge } from './status-badge'

function StatusControl({ form, submission }: { form: FormOption; submission: InboxSubmission }) {
  const { t, i18n } = useTranslation('forms')
  const messageOf = useApiErrorMessage()
  const change = useMutation(changeStatusMutation(useQueryClient(), form.name, submission.id))
  const others = form.statuses.filter((status) => status !== submission.status)
  const request = (status: string) =>
    change.mutate(status, {
      onSuccess: () =>
        toastManager.add({
          type: 'success',
          title: t('change.changed', { status: statusLabel(i18n, t, status) })
        }),
      onError: (error) =>
        toastManager.add({
          type: 'error',
          title: t('change.failed'),
          description: messageOf(error)
        })
    })
  return (
    <FrameSection
      title={t('change.title')}
      badges={<StatusBadge status={submission.status} />}
      description={
        submission.updatedBy
          ? t('change.updatedBy', {
              name: submission.updatedBy,
              date: formatDateTime(i18n.language, submission.updatedAt)
            })
          : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        {others.map((status) => (
          <Button
            key={status}
            variant="outline"
            disabled={change.isPending}
            onClick={() => request(status)}
          >
            {t('change.markAs', { status: statusLabel(i18n, t, status) })}
          </Button>
        ))}
      </div>
    </FrameSection>
  )
}

interface SubmissionPageProps {
  name: string
  submissionId: string
}

export function SubmissionPage({ name, submissionId }: SubmissionPageProps) {
  const { t, i18n } = useTranslation('forms')
  const { defaultLocale } = useLocaleConfig()
  const { data: forms } = useSuspenseQuery(formsQuery)
  const { data } = useSuspenseQuery(submissionQuery(name, submissionId))
  const form = forms.find((candidate) => candidate.name === name)
  if (!form) {
    return <ListNotice title={t('missing.title')} description={t('missing.description')} />
  }
  const { submission, entries } = data
  const title = formTitle(form, i18n.language, defaultLocale)
  return (
    <>
      <Button
        variant="ghost"
        className="self-start"
        render={<Link to="/forms/$name" params={{ name }} />}
      >
        <ArrowLeftIcon aria-hidden />
        {t('detail.back', { form: title })}
      </Button>
      <PageHeader
        title={title}
        description={t('detail.received', {
          date: formatDateTime(i18n.language, submission.createdAt)
        })}
      />
      <FrameSection title={t('detail.details')}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(8rem,12rem)_1fr]">
          {fieldEntries(form.schema).map(([key, node]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{fieldLabel(key, node)}</dt>
              <dd className="min-w-0 break-words">
                <FieldValue node={node} value={submission.payload[key]} entries={entries} />
              </dd>
            </div>
          ))}
        </dl>
      </FrameSection>
      <StatusControl form={form} submission={submission} />
    </>
  )
}
