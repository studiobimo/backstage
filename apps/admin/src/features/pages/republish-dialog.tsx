import type { PageSummary, RepublishStatus } from '@studiobimo/backstage/internal'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack } from '@/components/ui/progress'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { ProblemsList } from '../page-editor/publish-notes'
import { pageLabel } from './page-label'
import { republishStatusQuery } from './republish-queries'
import { REPUBLISH_PHASE, useRepublish, type RepublishProgress } from './use-republish'

function SkippedPages({ progress, pages }: { progress: RepublishProgress; pages: PageSummary[] }) {
  const { t, i18n } = useTranslation('pages')
  if (progress.skipped.length === 0) return null
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertDescription>
        <p className="font-medium">{t('republish.skipped', { count: progress.skipped.length })}</p>
        <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {progress.skipped.map(({ pageId, problems }) => {
            const page = pages.find((candidate) => candidate.id === pageId)
            return (
              <li key={pageId}>
                <Link
                  to="/pages/$pageId"
                  params={{ pageId }}
                  className="font-medium underline underline-offset-2"
                >
                  {page ? pageLabel(page, i18n.language) : pageId}
                </Link>
                <ProblemsList problems={problems} blocks={[]} />
              </li>
            )
          })}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function Summary({ progress }: { progress: RepublishProgress }) {
  const { t } = useTranslation('pages')
  const messageOf = useApiErrorMessage()
  if (progress.phase === REPUBLISH_PHASE.failed) {
    return (
      <Alert variant="error" role="alert">
        <CircleAlertIcon />
        <AlertDescription>{messageOf(progress.error)}</AlertDescription>
      </Alert>
    )
  }
  const key = progress.phase === REPUBLISH_PHASE.done ? 'done' : 'stopped'
  return (
    <p role="status" className="text-sm">
      {t(`republish.${key}`, { count: progress.processed, writes: progress.writes })}
    </p>
  )
}

function Confirmation({ status, started }: { status: RepublishStatus; started: boolean }) {
  const { t } = useTranslation('pages')
  const overQuota = status.writes > status.dailyWriteLimit
  return (
    <>
      <p className="text-muted-foreground text-sm">
        {t(started ? 'republish.resumeIntro' : 'republish.intro', { count: status.remaining })}
      </p>
      <p className="text-sm">
        {t('republish.writes', { writes: status.writes, limit: status.dailyWriteLimit })}
      </p>
      {status.changed > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>{t('republish.changed', { count: status.changed })}</AlertDescription>
        </Alert>
      )}
      {overQuota && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>
            {t('republish.overQuota', { limit: status.dailyWriteLimit })}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

interface RepublishActionsProps {
  republish: ReturnType<typeof useRepublish>
  remaining: number
  started: boolean
  finished: boolean
}

export function RepublishActions({
  republish,
  remaining,
  started,
  finished
}: RepublishActionsProps) {
  const { t } = useTranslation('pages')
  const { phase } = republish.progress
  if (phase === REPUBLISH_PHASE.running) {
    return (
      <Button variant="outline" onClick={republish.stop}>
        {t('republish.stop')}
      </Button>
    )
  }
  return (
    <>
      <AlertDialogClose render={<Button variant="outline" />}>
        {t(finished ? 'republish.close' : 'form.cancel')}
      </AlertDialogClose>
      {phase !== REPUBLISH_PHASE.done && (
        <Button disabled={remaining === 0} onClick={() => void republish.run(remaining)}>
          {t(started ? 'republish.resumeAction' : 'republish.start')}
        </Button>
      )}
    </>
  )
}

export function RepublishProgressView({
  progress,
  pages
}: {
  progress: RepublishProgress
  pages: PageSummary[]
}) {
  const { t } = useTranslation('pages')
  const running = progress.phase === REPUBLISH_PHASE.running
  const finished = progress.phase !== REPUBLISH_PHASE.idle && !running
  return (
    <>
      {running && (
        <Progress value={progress.processed} max={Math.max(progress.total, 1)}>
          <ProgressLabel>
            {t('republish.running', { done: progress.processed, total: progress.total })}
          </ProgressLabel>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
      )}
      {finished && <Summary progress={progress} />}
      <SkippedPages progress={progress} pages={pages} />
    </>
  )
}

export function RepublishAllDialog({ pages }: { pages: PageSummary[] }) {
  const { t } = useTranslation('pages')
  const [open, setOpen] = useState(false)
  const republish = useRepublish()
  const { progress, scope } = republish
  const running = progress.phase === REPUBLISH_PHASE.running
  const finished = progress.phase !== REPUBLISH_PHASE.idle && !running
  const status = useQuery(republishStatusQuery(scope, open && !running && !finished)).data
  const started = scope.since !== null && progress.phase === REPUBLISH_PHASE.idle
  const handleOpenChange = (next: boolean) => {
    if (running) return
    if (!next) republish.reset()
    setOpen(next)
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCwIcon aria-hidden />
        {t(started ? 'republish.resume' : 'republish.open')}
      </Button>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(started ? 'republish.resumeTitle' : 'republish.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('republish.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-2">
            {!running && !finished && status && <Confirmation status={status} started={started} />}
            <RepublishProgressView progress={progress} pages={pages} />
          </div>
          <AlertDialogFooter>
            <RepublishActions
              republish={republish}
              remaining={status?.remaining ?? 0}
              started={scope.since !== null}
              finished={finished}
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  )
}
