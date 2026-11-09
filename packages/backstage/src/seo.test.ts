import { describe, expect, it } from 'vitest'

import {
  alternateLinks,
  buildRobots,
  buildSitemap,
  canonicalUrl,
  type PublishedPage
} from './seo.ts'

const SITE = 'https://example.com/'
const PUBLISHED_AT = Date.UTC(2026, 10, 9)

const home: PublishedPage = {
  pageId: 'h',
  isHome: true,
  slugs: { en: null, es: null },
  publishedAt: PUBLISHED_AT
}
const about: PublishedPage = {
  pageId: 'a',
  isHome: false,
  slugs: { en: 'about', es: 'nosotros' },
  publishedAt: PUBLISHED_AT
}

describe('canonicalUrl', () => {
  it('serves the default locale at the root and the other under its prefix', () => {
    expect(canonicalUrl(SITE, home, 'en')).toBe('https://example.com/')
    expect(canonicalUrl(SITE, home, 'es')).toBe('https://example.com/es/')
    expect(canonicalUrl(SITE, about, 'en')).toBe('https://example.com/about')
    expect(canonicalUrl(SITE, about, 'es')).toBe('https://example.com/es/nosotros')
  })
})

describe('alternateLinks', () => {
  it('lists every locale and an x-default pointing at the default locale', () => {
    expect(alternateLinks(SITE, about)).toEqual([
      { hreflang: 'en', href: 'https://example.com/about' },
      { hreflang: 'es', href: 'https://example.com/es/nosotros' },
      { hreflang: 'x-default', href: 'https://example.com/about' }
    ])
  })

  it('leaves out a locale with no slug', () => {
    const links = alternateLinks(SITE, { ...about, slugs: { en: 'about', es: null } })
    expect(links.map((link) => link.hreflang)).toEqual(['en', 'x-default'])
  })
})

describe('buildSitemap', () => {
  const sitemap = buildSitemap(SITE, [home, about])

  it('has one url for each page and locale, with alternates', () => {
    expect(sitemap.match(/<url>/g)).toHaveLength(4)
    expect(sitemap).toContain('<loc>https://example.com/es/nosotros</loc>')
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/nosotros"/>'
    )
    expect(sitemap).toContain('<lastmod>2026-11-09T00:00:00.000Z</lastmod>')
  })

  it('is an empty urlset when nothing is published', () => {
    expect(buildSitemap(SITE, [])).not.toContain('<url>')
  })

  it('escapes characters that are special in xml', () => {
    const odd = { ...about, slugs: { en: 'a&b', es: null } }
    expect(buildSitemap(SITE, [odd])).toContain('https://example.com/a&amp;b')
  })
})

describe('buildRobots', () => {
  it('allows crawling and names the sitemap', () => {
    expect(buildRobots('https://example.com/some/path')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n'
    )
  })
})
