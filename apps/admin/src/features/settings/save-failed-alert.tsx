import { CircleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function SaveFailedAlert() {
  const { t } = useTranslation('settings')
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('failed.title')}</AlertTitle>
      <AlertDescription>{t('failed.description')}</AlertDescription>
    </Alert>
  )
}
