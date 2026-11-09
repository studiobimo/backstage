import { z } from 'zod'

import { DEFAULT_LOCALE, LOCALES, type Locale } from './pages.ts'
import type { Snapshot } from './publishing.ts'

export const SEO = {
  indexKey: 'index:pages',
  format: 1,
  defaultLocale: DEFAULT_LOCALE,
  sitemapPath: '/sitemap.xml',
  robotsPath: '/robots.txt',
  cacheControl: 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
  xml: {
    header: '<?xml version="1.0" encoding="UTF-8"?>',
    namespace: 'http://www.sitemaps.org/schemas/sitemap/0.9',
    xhtmlNamespace: 'http://www.w3.org/1999/xhtml'
  },
  xDefault: 'x-default'
} as const

const publishedPageSchema = z.object({
  pageId: z.string(),
  isHome: z.boolean(),
  slugs: z.record(z.enum(LOCALES), z.string().nullable()),
  publishedAt: z.number().int()
})
export type PublishedPage = z.infer<typeof publishedPageSchema>

export const publishedIndexSchema = z.object({
  format: z.literal(SEO.format),
  pages: z.array(publishedPageSchema)
})
export type PublishedIndex = z.infer<typeof publishedIndexSchema>

export const EMPTY_PUBLISHED_INDEX: PublishedIndex = { format: SEO.format, pages: [] }

export const removeFromIndex = (index: PublishedIndex, pageId: string): PublishedIndex => ({
  ...index,
  pages: index.pages.filter((page) => page.pageId !== pageId)
})

export const upsertIntoIndex = (
  index: PublishedIndex,
  snapshots: readonly Snapshot[]
): PublishedIndex => {
  const [first] = snapshots
  if (!first) return index
  const entry: PublishedPage = {
    pageId: first.pageId,
    isHome: first.isHome,
    publishedAt: first.publishedAt,
    slugs: Object.fromEntries(
      snapshots.map(({ locale, slug }) => [locale, slug])
    ) as PublishedPage['slugs']
  }
  return { ...index, pages: [...removeFromIndex(index, first.pageId).pages, entry] }
}

export interface AlternateLink {
  hreflang: string
  href: string
}

const originOf = (siteUrl: string) => new URL(siteUrl).origin

const pathOf = (page: PublishedPage, locale: Locale) => {
  const prefix = locale === SEO.defaultLocale ? '' : `/${locale}`
  if (page.isHome) return prefix === '' ? '/' : `${prefix}/`
  return `${prefix}/${page.slugs[locale]}`
}

const isLive = (page: PublishedPage, locale: Locale) => page.isHome || Boolean(page.slugs[locale])

export const canonicalUrl = (siteUrl: string, page: PublishedPage, locale: Locale) =>
  `${originOf(siteUrl)}${pathOf(page, locale)}`

export const alternateLinks = (siteUrl: string, page: PublishedPage): AlternateLink[] => {
  const live = LOCALES.filter((locale) => isLive(page, locale))
  const links = live.map((locale) => ({
    hreflang: locale,
    href: canonicalUrl(siteUrl, page, locale)
  }))
  return live.includes(SEO.defaultLocale)
    ? [...links, { hreflang: SEO.xDefault, href: canonicalUrl(siteUrl, page, SEO.defaultLocale) }]
    : links
}

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const urlEntry = (siteUrl: string, page: PublishedPage, locale: Locale) =>
  [
    '  <url>',
    `    <loc>${escapeXml(canonicalUrl(siteUrl, page, locale))}</loc>`,
    `    <lastmod>${new Date(page.publishedAt).toISOString()}</lastmod>`,
    ...alternateLinks(siteUrl, page).map(
      ({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`
    ),
    '  </url>'
  ].join('\n')

export const buildSitemap = (siteUrl: string, pages: readonly PublishedPage[]) =>
  [
    SEO.xml.header,
    `<urlset xmlns="${SEO.xml.namespace}" xmlns:xhtml="${SEO.xml.xhtmlNamespace}">`,
    ...pages.flatMap((page) =>
      LOCALES.filter((locale) => isLive(page, locale)).map((locale) =>
        urlEntry(siteUrl, page, locale)
      )
    ),
    '</urlset>',
    ''
  ].join('\n')

export const buildRobots = (siteUrl: string) =>
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${originOf(siteUrl)}${SEO.sitemapPath}`, ''].join(
    '\n'
  )
