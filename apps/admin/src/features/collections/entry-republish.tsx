import type { RepublishEntry } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

import { pagesQuery } from '../pages/queries'
import { RepublishActions, RepublishProgressView } from '../pages/republish-dialog'
import { entryRun } from '../pages/republish-run'
import { REPUBLISH_PHASE, useRepublish } from '../pages/use-republish'

import type { PendingRun } from './use-entry-dependents'

interface EntryRepublishDialogProps {
  entry: RepublishEntry
  pending: PendingRun | null
  onClose: () => void
}

export function EntryRepublishDialog({ entry, pending, onClose }: EntryRepublishDialogProps) {
  const { t } = useTranslation('entryEditor')
  const republish = useRepublish(entry)
  const pages = useQuery({ ...pagesQuery, enabled: pending !== null }).data ?? []
  const started = useRef(false)
  const { run } = republish
  useEffect(() => {
    if (!pending || started.current) return
    started.current = true
    void run(pending.total, { ...entryRun(entry), cursor: pending.cursor })
  }, [pending, run, entry])
  const { progress } = republish
  const running = progress.phase === REPUBLISH_PHASE.running
  const finished = progress.phase !== REPUBLISH_PHASE.idle && !running
  const handleOpenChange = (open: boolean) => {
    if (open || running) return
    started.current = false
    republish.reset()
    onClose()
  }
  return (
    <AlertDialog open={pending !== null} onOpenChange={handleOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dependents.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('dependents.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 px-6 pb-2">
          <RepublishProgressView progress={progress} pages={pages} />
        </div>
        <AlertDialogFooter>
          <RepublishActions
            republish={republish}
            remaining={progress.remaining}
            started
            finished={finished}
          />
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
