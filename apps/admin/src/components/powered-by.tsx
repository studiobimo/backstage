import { useTranslation } from 'react-i18next'

import { site } from '@/config/site'
import { cn } from '@/lib/utils'

export function PoweredBy({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={site.creditUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline',
        className
      )}
    >
      {t('brand.credit')}
    </a>
  )
}
