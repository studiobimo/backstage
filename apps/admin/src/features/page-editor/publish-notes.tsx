import type { PageBlock, PageSummary, PublishProblem } from '@studiobimo/backstage/internal'
import { CircleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'
import { useApiErrorMessage } from '@/lib/api-feedback'
import { formatDateTime } from '@/lib/format'
import { publishProblemKey } from '@/lib/publish-problem-key'

type PublishableRecord = Pick<PageSummary, 'publishedAt' | 'publishedBy'>

interface PublishNotesProps {
  page: PublishableRecord
  context?: 'entry'
  dirty: boolean
  changed: boolean
  error: unknown
  blocks: PageBlock[]
  hintId: string
  dependents?: string
}

interface ProblemsListProps {
  problems: PublishProblem[]
  blocks: PageBlock[]
  context?: 'entry'
}

export function ProblemsList({ problems, blocks, context }: ProblemsListProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <ul className="list-disc pl-4">
      {problems.map(({ reason, blockId, path }) => (
        <li key={`${reason}:${blockId}:${path}`}>
          {t(publishProblemKey({ reason, path }), {
            name: blocks.find((block) => block.id === blockId)?.block ?? '',
            path: path ?? '',
            context,
            defaultValue: t('publish.problems.invalid_content', { name: '', context })
          })}
        </li>
      ))}
    </ul>
  )
}

interface NoticeProps {
  error: unknown
  blocks: PageBlock[]
  context?: 'entry'
}

function ProblemsAlert({ error, blocks, context }: NoticeProps & { error: ApiError }) {
  const { t } = useTranslation('pageEditor')
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('publish.problems.title', { context })}</AlertTitle>
      <AlertDescription>
        <ProblemsList problems={error.problems} blocks={blocks} context={context} />
      </AlertDescription>
    </Alert>
  )
}

function PublishNotice({ error, blocks, context }: NoticeProps) {
  const messageOf = useApiErrorMessage()
  if (!error) return null
  if (error instanceof ApiError && error.problems.length > 0) {
    return <ProblemsAlert error={error} blocks={blocks} context={context} />
  }
  return (
    <p role="alert" className="text-destructive-foreground text-sm">
      {messageOf(error)}
    </p>
  )
}

function usePublishHint({
  page,
  dirty,
  changed,
  context
}: Pick<PublishNotesProps, 'page' | 'dirty' | 'changed' | 'context'>) {
  const { t, i18n } = useTranslation('pageEditor')
  if (dirty) return t('publish.saveFirst')
  if (page.publishedAt === null) return t('publish.notLive', { context })
  return t(changed ? 'publish.changedSince' : 'publish.since', {
    context,
    when: formatDateTime(i18n.language, page.publishedAt),
    name: page.publishedBy ?? t('publish.someone')
  })
}

export function PublishNotes({
  page,
  context,
  dirty,
  changed,
  error,
  blocks,
  hintId,
  dependents
}: PublishNotesProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <section aria-label={t('publish.label')} className="flex flex-col gap-3">
      <p id={hintId} className="text-muted-foreground text-sm">
        {[usePublishHint({ page, dirty, changed, context }), dependents].filter(Boolean).join(' ')}
      </p>
      <PublishNotice error={error} blocks={blocks} context={context} />
    </section>
  )
}
