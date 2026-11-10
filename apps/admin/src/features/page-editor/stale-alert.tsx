import type { PageStamp } from '@studiobimo/backstage'
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

interface StaleAlertProps {
  current?: PageStamp
  onReload: () => void
}

export function StaleAlert({ current, onReload }: StaleAlertProps) {
  const { t, i18n } = useTranslation('pageEditor')
  const when = current ? formatDateTime(i18n.language, current.updatedAt) : ''
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('stale.title')}</AlertTitle>
      <AlertDescription>
        {t('stale.description', { name: current?.updatedBy ?? t('stale.someone'), when })}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onReload}>
          <RefreshCwIcon aria-hidden />
          {t('stale.reload')}
        </Button>
      </AlertAction>
    </Alert>
  )
}
