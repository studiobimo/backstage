import { EyeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface PreviewButtonProps {
  hintId: string
  disabled: boolean
  previewing: boolean
  onPreview: () => void
}

export function PreviewButton({ hintId, disabled, previewing, onPreview }: PreviewButtonProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <Button
      variant="outline"
      aria-describedby={hintId}
      loading={previewing}
      disabled={disabled || previewing}
      onClick={onPreview}
    >
      <EyeIcon aria-hidden />
      <span className="sr-only sm:not-sr-only">{t('preview.label')}</span>
    </Button>
  )
}
