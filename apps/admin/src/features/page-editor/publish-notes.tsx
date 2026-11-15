import type { PageBlock, PageSummary, PublishProblem } from '@studiobimo/backstage/internal'
import { CircleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'
import { useApiErrorMessage } from '@/lib/api-feedback'
import { formatDateTime } from '@/lib/format'
import { publishProblemKey } from '@/lib/publish-problem-key'

interface PublishNotesProps {
  page: PageSummary
  dirty: boolean
  changed: boolean
  error: unknown
  blocks: PageBlock[]
  hintId: string
}

interface ProblemsListProps {
  problems: PublishProblem[]
  blocks: PageBlock[]
}

export function ProblemsList({ problems, blocks }: ProblemsListProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <ul className="list-disc pl-4">
      {problems.map(({ reason, blockId, path }) => (
        <li key={`${reason}:${blockId}:${path}`}>
          {t(publishProblemKey({ reason, path }), {
            name: blocks.find((block) => block.id === blockId)?.block ?? '',
            path: path ?? '',
            defaultValue: t('publish.problems.invalid_content', { name: '' })
          })}
        </li>
      ))}
    </ul>
  )
}

function ProblemsAlert({ error, blocks }: { error: ApiError; blocks: PageBlock[] }) {
  const { t } = useTranslation('pageEditor')
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('publish.problems.title')}</AlertTitle>
      <AlertDescription>
        <ProblemsList problems={error.problems} blocks={blocks} />
      </AlertDescription>
    </Alert>
  )
}

function PublishNotice({ error, blocks }: { error: unknown; blocks: PageBlock[] }) {
  const messageOf = useApiErrorMessage()
  if (!error) return null
  if (error instanceof ApiError && error.problems.length > 0) {
    return <ProblemsAlert error={error} blocks={blocks} />
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
  changed
}: Pick<PublishNotesProps, 'page' | 'dirty' | 'changed'>) {
  const { t, i18n } = useTranslation('pageEditor')
  if (dirty) return t('publish.saveFirst')
  if (page.publishedAt === null) return t('publish.notLive')
  return t(changed ? 'publish.changedSince' : 'publish.since', {
    when: formatDateTime(i18n.language, page.publishedAt),
    name: page.publishedBy ?? t('publish.someone')
  })
}

export function PublishNotes({ page, dirty, changed, error, blocks, hintId }: PublishNotesProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <section aria-label={t('publish.label')} className="flex flex-col gap-3">
      <p id={hintId} className="text-muted-foreground text-sm">
        {usePublishHint({ page, dirty, changed })}
      </p>
      <PublishNotice error={error} blocks={blocks} />
    </section>
  )
}
