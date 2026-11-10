import type { PageBlock, PageSummary } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, GlobeIcon, GlobeLockIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

import { publishPageMutation, unpublishPageMutation } from './queries'

interface PublishPanelProps {
  page: PageSummary
  name: string
  version: number
  blocks: PageBlock[]
  dirty: boolean
}

function usePublishFeedback() {
  const { t } = useTranslation('pageEditor')
  return (message: 'published' | 'unpublished') =>
    toastManager.add({ type: 'success', title: t(`publish.toast.${message}`) })
}

function PublishStatus({
  page,
  dirty,
  hintId
}: {
  page: PageSummary
  dirty: boolean
  hintId: string
}) {
  const { t, i18n } = useTranslation('pageEditor')
  const { publishedAt } = page
  const published = publishedAt !== null
  const when = published ? formatDateTime(i18n.language, publishedAt) : ''
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <Badge variant={published ? 'success' : 'outline'}>
        {t(published ? 'publish.status.published' : 'publish.status.draft')}
      </Badge>
      <p id={hintId} className="text-muted-foreground text-sm">
        {dirty
          ? t('publish.saveFirst')
          : published
            ? t('publish.since', { when, name: page.publishedBy ?? t('publish.someone') })
            : t('publish.notLive')}
      </p>
    </div>
  )
}

function ProblemsAlert({ error, blocks }: { error: ApiError; blocks: PageBlock[] }) {
  const { t } = useTranslation('pageEditor')
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('publish.problems.title')}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {error.problems.map(({ reason, blockId }) => (
            <li key={`${reason}:${blockId}`}>
              {t(`publish.problems.${reason}`, {
                name: blocks.find((block) => block.id === blockId)?.block ?? '',
                defaultValue: t('publish.problems.invalid_content', { name: '' })
              })}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function PublishNotice({ error, blocks }: { error: unknown; blocks: PageBlock[] }) {
  const { t } = useTranslation('pageEditor')
  if (!error) return null
  if (error instanceof ApiError && error.problems.length > 0) {
    return <ProblemsAlert error={error} blocks={blocks} />
  }
  return (
    <p role="alert" className="text-destructive-foreground text-sm">
      {t(`publish.errors.${error instanceof ApiError ? error.code : 'internal'}`, {
        defaultValue: t('publish.errors.internal')
      })}
    </p>
  )
}

function UnpublishDialog({
  name,
  pending,
  onConfirm
}: {
  name: string
  pending: boolean
  onConfirm: () => void
}) {
  const { t } = useTranslation('pageEditor')
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" disabled={pending} />}>
        <GlobeLockIcon aria-hidden />
        {t('publish.unpublish')}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('publish.unpublishTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('publish.unpublishDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('publish.cancel')}
          </AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" onClick={onConfirm} />}>
            {t('publish.unpublish')}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

export function PublishPanel({ page, name, version, blocks, dirty }: PublishPanelProps) {
  const { t } = useTranslation('pageEditor')
  const queryClient = useQueryClient()
  const hintId = useId()
  const announce = usePublishFeedback()
  const publish = useMutation(publishPageMutation(queryClient, page.id))
  const unpublish = useMutation(unpublishPageMutation(queryClient, page.id))
  const failed = publish.error ?? unpublish.error
  const reset = () => {
    publish.reset()
    unpublish.reset()
  }
  return (
    <section aria-label={t('publish.label')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <PublishStatus page={page} dirty={dirty} hintId={hintId} />
        <div className="flex items-center gap-2">
          {page.publishedAt !== null && (
            <UnpublishDialog
              name={name}
              pending={unpublish.isPending}
              onConfirm={() => {
                reset()
                unpublish.mutate(undefined, { onSuccess: () => announce('unpublished') })
              }}
            />
          )}
          <Button
            aria-describedby={hintId}
            disabled={dirty || publish.isPending}
            onClick={() => {
              reset()
              publish.mutate(version, { onSuccess: () => announce('published') })
            }}
          >
            {publish.isPending ? <Spinner /> : <GlobeIcon aria-hidden />}
            {t('publish.publish')}
          </Button>
        </div>
      </div>
      <PublishNotice error={failed} blocks={blocks} />
    </section>
  )
}
