import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'

import { languageName, type LocaleStatus } from './locale-status.ts'

interface LocaleSwitcherProps {
  locales: readonly string[]
  active: string
  status: Record<string, LocaleStatus>
  showInvalid: boolean
  onChange: (locale: string) => void
}

function StatusBadge({ status, showInvalid }: { status?: LocaleStatus; showInvalid: boolean }) {
  const { t } = useTranslation('blockForm')
  if (showInvalid && status?.invalid) {
    return <Badge variant="error">{t('locale.invalid', { count: status.invalid })}</Badge>
  }
  if (status?.missing) {
    return <Badge variant="warning">{t('locale.missingCount', { count: status.missing })}</Badge>
  }
  return null
}

export function LocaleSwitcher({
  locales,
  active,
  status,
  showInvalid,
  onChange
}: LocaleSwitcherProps) {
  const { t, i18n } = useTranslation('blockForm')
  return (
    <div className="z-20 pb-2 sm:sticky sm:top-10">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-sm">{t('locale.editing')}</p>
          <p className="text-muted-foreground text-xs">{t('locale.hint')}</p>
        </div>
        <SegmentedControl role="group" aria-label={t('locale.editing')} className="w-full sm:w-fit">
          {locales.map((locale) => (
            <SegmentedControlItem
              key={locale}
              aria-pressed={locale === active}
              data-pressed={locale === active ? '' : undefined}
              className="flex-1 text-muted-foreground sm:flex-none"
              onClick={() => onChange(locale)}
            >
              {languageName(locale, i18n.language)}
              <StatusBadge status={status[locale]} showInvalid={showInvalid} />
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
    </div>
  )
}
