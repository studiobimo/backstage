import { pathOf } from '@studiobimo/backstage/internal'
import { describe, expect, it } from 'vitest'

import { aboutPage } from '@/test/fixtures'
import { DEFAULT_TEST_CONFIG } from '@/test/query-client'

import { pageAddresses, slugPrefix } from './page-label'

const { locales } = DEFAULT_TEST_CONFIG
const spanishFirst = { locales: ['es', 'en'], defaultLocale: 'es' }

const homePage = {
  ...aboutPage,
  isHome: true,
  locales: locales.map((locale) => ({ locale, slug: null, title: 'Home' }))
}

describe('page addresses', () => {
  it('match the paths the site routes with for a regular page', () => {
    expect(pageAddresses(aboutPage, DEFAULT_TEST_CONFIG)).toEqual([
      pathOf({ locale: 'en', slug: 'about' }),
      pathOf({ locale: 'es', slug: 'acerca' })
    ])
    expect(pageAddresses(aboutPage, DEFAULT_TEST_CONFIG)).toEqual(['/about', '/es/acerca'])
  })

  it('match the paths the site routes with for the home page', () => {
    expect(pageAddresses(homePage, DEFAULT_TEST_CONFIG)).toEqual(
      locales.map((locale) => pathOf({ locale, slug: null }))
    )
    expect(pageAddresses(homePage, DEFAULT_TEST_CONFIG)).toEqual(['/', '/es'])
  })

  it('leave out a language that has no address yet', () => {
    const missing = { ...aboutPage, locales: [{ locale: 'en', slug: 'about', title: 'About' }] }
    expect(pageAddresses(missing, DEFAULT_TEST_CONFIG)).toEqual(['/about'])
  })

  it('prefix the slug field the way the site does', () => {
    expect(slugPrefix('en', DEFAULT_TEST_CONFIG)).toBe('/')
    expect(slugPrefix('es', DEFAULT_TEST_CONFIG)).toBe('/es/')
  })

  it('serve the default locale at the root and the others under their prefix', () => {
    expect(pageAddresses(aboutPage, spanishFirst)).toEqual(['/acerca', '/en/about'])
    expect(slugPrefix('es', spanishFirst)).toBe('/')
    expect(slugPrefix('en', spanishFirst)).toBe('/en/')
  })
})
