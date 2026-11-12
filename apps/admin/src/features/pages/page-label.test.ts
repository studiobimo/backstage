import { LOCALES, pathOf } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { pageAddresses, slugPrefix } from './page-label'

const homePage = {
  ...aboutPage,
  isHome: true,
  locales: LOCALES.map((locale) => ({ locale, slug: null, title: 'Home' }))
}

describe('page addresses', () => {
  it('match the paths the site routes with for a regular page', () => {
    expect(pageAddresses(aboutPage)).toEqual([
      pathOf({ locale: 'en', slug: 'about' }),
      pathOf({ locale: 'es', slug: 'acerca' })
    ])
    expect(pageAddresses(aboutPage)).toEqual(['/about', '/es/acerca'])
  })

  it('match the paths the site routes with for the home page', () => {
    expect(pageAddresses(homePage)).toEqual(LOCALES.map((locale) => pathOf({ locale, slug: null })))
    expect(pageAddresses(homePage)).toEqual(['/', '/es'])
  })

  it('leave out a language that has no address yet', () => {
    const missing = { ...aboutPage, locales: [{ locale: 'en', slug: 'about', title: 'About' }] }
    expect(pageAddresses(missing)).toEqual(['/about'])
  })

  it('prefix the slug field the way the site does', () => {
    expect(slugPrefix('en')).toBe('/')
    expect(slugPrefix('es')).toBe('/es/')
  })
})
