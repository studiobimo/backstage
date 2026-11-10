import { LOCALES, type Page } from '@studiobimo/backstage'

export const pageLabel = (page: Page, language: string) => {
  const rows = page.locales
  const row = rows.find((candidate) => language.startsWith(candidate.locale)) ?? rows[0]
  return row?.title ?? ''
}

const pageSlugLabel = (page: Page, locale: string) => {
  const slug = page.locales.find((row) => row.locale === locale)?.slug
  return slug ? `/${locale}/${slug}` : '/'
}

export const pageAddresses = (page: Page) =>
  page.isHome ? ['/'] : LOCALES.map((locale) => pageSlugLabel(page, locale))
