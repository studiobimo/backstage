import { RotateCcwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function RestoredDraftNotice({ onDiscard }: { onDiscard: () => void }) {
  const { t } = useTranslation('pageEditor')
  return (
    <Alert variant="warning" role="status">
      <RotateCcwIcon />
      <AlertTitle>{t('draft.title')}</AlertTitle>
      <AlertDescription>{t('draft.description')}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onDiscard}>
          {t('draft.discard')}
        </Button>
      </AlertAction>
    </Alert>
  )
}
