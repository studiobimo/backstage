import { z } from 'zod'

export type Locale = string

export interface LocaleConfig {
  readonly locales: readonly Locale[]
  readonly defaultLocale: Locale
}

export const LOCALE = {
  default: { locales: ['en', 'es'], defaultLocale: 'en' },
  pattern: /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/
} as const satisfies { default: LocaleConfig; pattern: RegExp }

export const localeConfigSchema = z.object({
  locales: z.array(z.string()).min(1),
  defaultLocale: z.string()
})

export function resolveLocaleConfig({
  locales = LOCALE.default.locales,
  defaultLocale = locales[0] ?? LOCALE.default.defaultLocale
}: Partial<LocaleConfig> = {}): LocaleConfig {
  if (locales.length === 0) throw new Error('A site needs at least one locale')
  for (const locale of locales) {
    if (!LOCALE.pattern.test(locale)) {
      throw new Error(
        `Locale "${locale}" must be a lowercase language code such as "en" or "pt-br"`
      )
    }
  }
  if (new Set(locales).size !== locales.length) throw new Error('Locales must not repeat')
  if (!locales.includes(defaultLocale)) {
    throw new Error(`Default locale "${defaultLocale}" must be one of the site's locales`)
  }
  return {
    locales: [defaultLocale, ...locales.filter((locale) => locale !== defaultLocale)],
    defaultLocale
  }
}

export const hasMultipleLocales = ({ locales }: Pick<LocaleConfig, 'locales'>) => locales.length > 1

export const perLocaleKeys = <T>(locales: readonly Locale[], valueOf: (locale: Locale) => T) =>
  Object.fromEntries(locales.map((locale) => [locale, valueOf(locale)])) as Record<Locale, T>
