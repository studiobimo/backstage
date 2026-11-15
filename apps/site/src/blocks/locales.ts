import type { LocaleConfig } from '@studiobimo/backstage'

export const SITE_LOCALES = {
  locales: ['en', 'es'],
  defaultLocale: 'en'
} as const satisfies LocaleConfig
