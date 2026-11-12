import { LOCALE, type Locale } from '../locales.ts'

export const LOCALE_NAME: Partial<Record<Locale, string>> = { en: 'English', es: 'Español' }

export const SWITCHER_LABEL: Partial<Record<Locale, string>> = { en: 'Language', es: 'Idioma' }

export const localeName = (locale: Locale) =>
  LOCALE_NAME[locale] ?? new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale

export const switcherLabel = (locale: Locale) =>
  SWITCHER_LABEL[locale] ?? SWITCHER_LABEL[LOCALE.default.defaultLocale] ?? 'Language'
