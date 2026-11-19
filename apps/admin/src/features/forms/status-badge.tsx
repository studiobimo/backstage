import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { STATUS, statusLabel } from './form-text'

const STATUS_VARIANT = {
  [STATUS.new]: 'info',
  [STATUS.confirmed]: 'success',
  [STATUS.declined]: 'error'
} as const

export function StatusBadge({ status }: { status: string }) {
  const { t, i18n } = useTranslation('forms')
  const variant = STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? 'outline'
  return <Badge variant={variant}>{statusLabel(i18n, t, status)}</Badge>
}
