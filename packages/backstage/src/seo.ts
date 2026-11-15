import { z } from 'zod'

import { PREVIEW_ROOT } from './blocks.ts'
import { hasMultipleLocales, LOCALE, type Locale, type LocaleConfig } from './locales.ts'
import type { Snapshot } from './publishing.ts'

export const SEO = {
  indexKey: 'index:pages',
  format: 1,
  sitemapPath: '/sitemap.xml',
  robotsPath: '/robots.txt',
  cacheControl: 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
  xml: {
    header: '<?xml version="1.0" encoding="UTF-8"?>',
    namespace: 'http://www.sitemaps.org/schemas/sitemap/0.9',
    xhtmlNamespace: 'http://www.w3.org/1999/xhtml'
  },
  xDefault: 'x-default',
  log: { rebuildFailed: 'sitemap index rebuild failed' }
} as const

const publishedPageSchema = z.object({
  pageId: z.string(),
  isHome: z.boolean(),
  slugs: z.record(z.string(), z.string().nullable()),
  publishedAt: z.number().int()
})
export type PublishedPage = z.infer<typeof publishedPageSchema>

export const publishedIndexSchema = z.object({
  format: z.literal(SEO.format),
  pages: z.array(publishedPageSchema)
})
export type PublishedIndex = z.infer<typeof publishedIndexSchema>

export const EMPTY_PUBLISHED_INDEX: PublishedIndex = { format: SEO.format, pages: [] }

const removeFromIndex = (index: PublishedIndex, pageId: string): PublishedIndex => ({
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

const pathOf = (page: PublishedPage, locale: Locale, defaultLocale: Locale) => {
  const prefix = locale === defaultLocale ? '' : `/${locale}`
  if (page.isHome) return prefix === '' ? '/' : `${prefix}/`
  return `${prefix}/${page.slugs[locale]}`
}

const isLive = (page: PublishedPage, locale: Locale) => page.isHome || Boolean(page.slugs[locale])

export const canonicalUrl = (
  siteUrl: string,
  page: PublishedPage,
  locale: Locale,
  defaultLocale: Locale = LOCALE.default.defaultLocale
) => `${originOf(siteUrl)}${pathOf(page, locale, defaultLocale)}`

export const alternateLinks = (
  siteUrl: string,
  page: PublishedPage,
  config: LocaleConfig = LOCALE.default
): AlternateLink[] => {
  if (!hasMultipleLocales(config)) return []
  const { locales, defaultLocale } = config
  const live = locales.filter((locale) => isLive(page, locale))
  const links = live.map((locale) => ({
    hreflang: locale,
    href: canonicalUrl(siteUrl, page, locale, defaultLocale)
  }))
  return live.includes(defaultLocale)
    ? [
        ...links,
        { hreflang: SEO.xDefault, href: canonicalUrl(siteUrl, page, defaultLocale, defaultLocale) }
      ]
    : links
}

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const urlEntry = (siteUrl: string, page: PublishedPage, locale: Locale, config: LocaleConfig) =>
  [
    '  <url>',
    `    <loc>${escapeXml(canonicalUrl(siteUrl, page, locale, config.defaultLocale))}</loc>`,
    `    <lastmod>${new Date(page.publishedAt).toISOString()}</lastmod>`,
    ...alternateLinks(siteUrl, page, config).map(
      ({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`
    ),
    '  </url>'
  ].join('\n')

export const buildSitemap = (
  siteUrl: string,
  pages: readonly PublishedPage[],
  config: LocaleConfig = LOCALE.default
) =>
  [
    SEO.xml.header,
    `<urlset xmlns="${SEO.xml.namespace}" xmlns:xhtml="${SEO.xml.xhtmlNamespace}">`,
    ...pages.flatMap((page) =>
      config.locales
        .filter((locale) => isLive(page, locale))
        .map((locale) => urlEntry(siteUrl, page, locale, config))
    ),
    '</urlset>',
    ''
  ].join('\n')

export const buildRobots = (siteUrl: string) =>
  [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${PREVIEW_ROOT}/`,
    '',
    `Sitemap: ${originOf(siteUrl)}${SEO.sitemapPath}`,
    ''
  ].join('\n')
