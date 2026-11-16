import { z } from 'zod'

import { PREVIEW_ROOT } from './blocks.ts'
import { entryPathOf, type CollectionRoute } from './entry-pages.ts'
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

const publishedEntryPageSchema = z.object({
  collection: z.string(),
  entryId: z.string(),
  slugs: z.record(z.string(), z.string().nullable()),
  publishedAt: z.number().int()
})
export type PublishedEntryPage = z.infer<typeof publishedEntryPageSchema>

export const publishedIndexSchema = z.object({
  format: z.literal(SEO.format),
  pages: z.array(publishedPageSchema),
  entries: z.array(publishedEntryPageSchema).default([])
})
export type PublishedIndex = z.input<typeof publishedIndexSchema>

export const EMPTY_PUBLISHED_INDEX: PublishedIndex = { format: SEO.format, pages: [], entries: [] }

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

export interface PublishedTarget {
  publishedAt: number
  isLive(locale: Locale): boolean
  pathOf(locale: Locale): string
}

const localePrefix = (locale: Locale, defaultLocale: Locale) =>
  locale === defaultLocale ? '' : `/${locale}`

const pageTarget = (page: PublishedPage, defaultLocale: Locale): PublishedTarget => ({
  publishedAt: page.publishedAt,
  isLive: (locale) => page.isHome || Boolean(page.slugs[locale]),
  pathOf: (locale) => {
    const prefix = localePrefix(locale, defaultLocale)
    if (page.isHome) return prefix === '' ? '/' : `${prefix}/`
    return `${prefix}/${page.slugs[locale]}`
  }
})

export const entryTarget = (
  entry: PublishedEntryPage,
  route: CollectionRoute,
  defaultLocale: Locale
): PublishedTarget => ({
  publishedAt: entry.publishedAt,
  isLive: (locale) => Boolean(entry.slugs[locale]),
  pathOf: (locale) => entryPathOf(route, entry.slugs[locale] ?? '', locale, defaultLocale)
})

export const targetUrl = (siteUrl: string, target: PublishedTarget, locale: Locale) =>
  `${originOf(siteUrl)}${target.pathOf(locale)}`

export const canonicalUrl = (
  siteUrl: string,
  page: PublishedPage,
  locale: Locale,
  defaultLocale: Locale = LOCALE.default.defaultLocale
) => targetUrl(siteUrl, pageTarget(page, defaultLocale), locale)

export const targetAlternates = (
  siteUrl: string,
  target: PublishedTarget,
  config: LocaleConfig
): AlternateLink[] => {
  if (!hasMultipleLocales(config)) return []
  const { locales, defaultLocale } = config
  const live = locales.filter((locale) => target.isLive(locale))
  const links = live.map((locale) => ({
    hreflang: locale,
    href: targetUrl(siteUrl, target, locale)
  }))
  return live.includes(defaultLocale)
    ? [...links, { hreflang: SEO.xDefault, href: targetUrl(siteUrl, target, defaultLocale) }]
    : links
}

export const alternateLinks = (
  siteUrl: string,
  page: PublishedPage,
  config: LocaleConfig = LOCALE.default
): AlternateLink[] => targetAlternates(siteUrl, pageTarget(page, config.defaultLocale), config)

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const urlEntry = (siteUrl: string, target: PublishedTarget, locale: Locale, config: LocaleConfig) =>
  [
    '  <url>',
    `    <loc>${escapeXml(targetUrl(siteUrl, target, locale))}</loc>`,
    `    <lastmod>${new Date(target.publishedAt).toISOString()}</lastmod>`,
    ...targetAlternates(siteUrl, target, config).map(
      ({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`
    ),
    '  </url>'
  ].join('\n')

export const buildSitemap = (
  siteUrl: string,
  pages: readonly PublishedPage[],
  config: LocaleConfig = LOCALE.default,
  entries: readonly PublishedTarget[] = []
) =>
  [
    SEO.xml.header,
    `<urlset xmlns="${SEO.xml.namespace}" xmlns:xhtml="${SEO.xml.xhtmlNamespace}">`,
    ...[...pages.map((page) => pageTarget(page, config.defaultLocale)), ...entries].flatMap(
      (target) =>
        config.locales
          .filter((locale) => target.isLive(locale))
          .map((locale) => urlEntry(siteUrl, target, locale, config))
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
