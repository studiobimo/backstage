import { pathOf, type Locale, type LocaleConfig, type Page } from '@studiobimo/backstage'

export const pageLabel = (page: Page, language: string) => {
  const rows = page.locales
  const row = rows.find((candidate) => language.startsWith(candidate.locale)) ?? rows[0]
  return row?.title ?? ''
}

export const slugPrefix = (locale: Locale, config: Pick<LocaleConfig, 'defaultLocale'>) =>
  pathOf({ locale, slug: null }, config).replace(/\/?$/, '/')

export const pageAddresses = (page: Page, config: LocaleConfig) =>
  config.locales.flatMap((locale) => {
    const slug = page.locales.find((row) => row.locale === locale)?.slug ?? null
    return page.isHome || slug ? [pathOf({ locale, slug }, config)] : []
  })
