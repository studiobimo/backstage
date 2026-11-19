import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { localizeSchema } from '@/lib/translate-schema'

import { useLocaleConfig } from '../config/queries'
import type { JsonSchema } from './spec.ts'

export function useLocalizedSchema(schema: JsonSchema) {
  const { i18n } = useTranslation()
  const { defaultLocale } = useLocaleConfig()
  return useMemo(
    () => localizeSchema(schema, i18n.language, defaultLocale),
    [schema, i18n.language, defaultLocale]
  )
}
