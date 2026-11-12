import { LOCALES, pathOf, type Locale, type Page } from '@studiobimo/backstage'

export const pageLabel = (page: Page, language: string) => {
  const rows = page.locales
  const row = rows.find((candidate) => language.startsWith(candidate.locale)) ?? rows[0]
  return row?.title ?? ''
}

export const slugPrefix = (locale: Locale) => pathOf({ locale, slug: null }).replace(/\/?$/, '/')

export const pageAddresses = (page: Page) =>
  LOCALES.flatMap((locale) => {
    const slug = page.locales.find((row) => row.locale === locale)?.slug ?? null
    return page.isHome || slug ? [pathOf({ locale, slug })] : []
  })
