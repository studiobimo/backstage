import { useBlocker } from '@tanstack/react-router'
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
import { Button } from '@/components/ui/button'

interface LeaveGuardProps {
  dirty: boolean
  draft?: { keep: () => void; discard: () => void }
}

export function LeaveGuard({ dirty, draft }: LeaveGuardProps) {
  const { t } = useTranslation('common')
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true
  })
  return (
    <AlertDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => !open && blocker.reset?.()}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leave.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(draft ? 'leave.descriptionDraft' : 'leave.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('leave.stay')}
          </AlertDialogClose>
          {draft && (
            <Button
              variant="outline"
              onClick={() => {
                draft.keep()
                blocker.proceed?.()
              }}
            >
              {t('leave.keepDraft')}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => {
              draft?.discard()
              blocker.proceed?.()
            }}
          >
            {t('leave.discard')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
