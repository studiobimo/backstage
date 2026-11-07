import { useTranslation } from 'react-i18next'

import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { resources } from '@/i18n/config'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const items = Object.keys(resources).map((language) => ({
    value: language,
    label: t(`language.names.${language}`)
  }))
  return (
    <Select
      items={items}
      value={i18n.resolvedLanguage}
      onValueChange={(language) => void i18n.changeLanguage(language ?? undefined)}
    >
      <SelectTrigger aria-label={t('language.label')} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
