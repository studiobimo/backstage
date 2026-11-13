import type { PageStamp } from '@studiobimo/backstage/internal'
import { CheckIcon, CircleAlertIcon, ClipboardIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

import type { DraftChange, PageDraft } from './draft'

interface StaleAlertProps {
  current?: PageStamp
  draft?: PageDraft
  changes?: DraftChange[]
  scope?: 'settings'
  onReload: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

function useCopyDraft(draft?: PageDraft) {
  const [state, setState] = useState<CopyState>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2))
      setState('copied')
    } catch {
      setState('failed')
    }
  }
  return { state, copy }
}

function ChangeList({ changes }: { changes: DraftChange[] }) {
  const { t } = useTranslation('pageEditor')
  return (
    <ul className="list-disc ps-5 text-sm">
      {changes.map((change, index) => (
        <li key={`${change.kind}-${change.position ?? index}`}>
          {t(`stale.changes.${change.kind}`, { name: change.name, position: change.position })}
        </li>
      ))}
    </ul>
  )
}

function ReloadConfirm({
  changes,
  scope,
  onReload
}: Pick<StaleAlertProps, 'changes' | 'scope' | 'onReload'>) {
  const { t } = useTranslation('pageEditor')
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <RefreshCwIcon aria-hidden />
        {t('stale.reload')}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('stale.confirm.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('stale.confirm.description', { context: scope })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {changes && (
          <div className="px-6 pb-2">
            <ChangeList changes={changes} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('stale.confirm.keep')}
          </AlertDialogClose>
          <Button variant="destructive" onClick={onReload}>
            {t('stale.confirm.discard')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

export function StaleAlert({ current, draft, changes, scope, onReload }: StaleAlertProps) {
  const { t, i18n } = useTranslation('pageEditor')
  const { state, copy } = useCopyDraft(draft)
  const when = current ? formatDateTime(i18n.language, current.updatedAt) : ''
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('stale.title')}</AlertTitle>
      <AlertDescription>
        {t('stale.description', {
          name: current?.updatedBy ?? t('stale.someone'),
          when,
          context: scope
        })}
        {state !== 'idle' && (
          <span className="sr-only" role="status">
            {t(`stale.copy.${state}Status`)}
          </span>
        )}
      </AlertDescription>
      <AlertAction>
        {draft && (
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            {state === 'copied' ? <CheckIcon aria-hidden /> : <ClipboardIcon aria-hidden />}
            {t(`stale.copy.${state}`)}
          </Button>
        )}
        <ReloadConfirm changes={changes} scope={scope} onReload={onReload} />
      </AlertAction>
    </Alert>
  )
}
