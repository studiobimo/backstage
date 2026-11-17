import { useTranslation } from 'react-i18next'

import { useLocaleConfig } from '../config/queries'

export const useBlockLanguage = () => {
  const { i18n } = useTranslation('pageEditor')
  const { defaultLocale } = useLocaleConfig()
  return { language: i18n.resolvedLanguage ?? defaultLocale, fallback: defaultLocale }
}
