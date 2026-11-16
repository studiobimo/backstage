import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { link, localized } from './fields.ts'
import { pageLinkIdsIn, pageLinkIssuesIn, resolvePageLinks } from './page-links.ts'
import type { PageAddresses } from './page-links.ts'

const LOCALES = ['en', 'es']
const CONFIG = { defaultLocale: 'en' }
const node = z.toJSONSchema(z.object({ cta: localized(link()), plain: link() }), {
  io: 'input',
  unrepresentable: 'any'
})

const addresses: PageAddresses = new Map([
  [
    'about',
    { pageId: 'about', isHome: false, publishedAt: 1, slugs: { en: 'about', es: 'acerca' } }
  ],
  ['home', { pageId: 'home', isHome: true, publishedAt: 1, slugs: { en: null, es: null } }],
  ['half', { pageId: 'half', isHome: false, publishedAt: 1, slugs: { en: 'half', es: null } }]
])

const content = (pageId: string) => ({
  cta: { en: { kind: 'page', pageId, label: 'About' } },
  plain: { href: '/x', label: '' }
})

describe('page links', () => {
  it('accepts a page link next to an address', () => {
    expect(link().safeParse({ kind: 'page', pageId: 'about' }).success).toBe(true)
    expect(link().safeParse({ kind: 'page', pageId: '' }).success).toBe(false)
    expect(link().safeParse({ href: '/a' }).success).toBe(true)
  })

  it('lists the pages a content links to', () => {
    expect(pageLinkIdsIn(node, content('about'))).toEqual(['about'])
  })

  it('resolves the address for each language', () => {
    const resolve = (locale: string) =>
      resolvePageLinks(node, content('about'), locale, addresses, CONFIG)
    expect(resolve('en')).toMatchObject({ cta: { en: { href: '/about', label: 'About' } } })
    expect(resolve('es')).toMatchObject({ cta: { en: { href: '/es/acerca' } } })
  })

  it('resolves the home page with and without a prefix', () => {
    expect(resolvePageLinks(node, content('home'), 'en', addresses, CONFIG)).toMatchObject({
      cta: { en: { href: '/' } }
    })
    expect(resolvePageLinks(node, content('home'), 'es', addresses, CONFIG)).toMatchObject({
      cta: { en: { href: '/es/' } }
    })
  })

  it('leaves plain addresses alone', () => {
    expect(resolvePageLinks(node, content('about'), 'es', addresses, CONFIG)).toMatchObject({
      plain: { href: '/x' }
    })
  })

  it('names an unpublished page and a page without an address in a language', () => {
    expect(pageLinkIssuesIn(node, content('gone'), addresses, LOCALES)).toEqual([
      { path: 'cta.en', pageId: 'gone', reason: 'unpublished' }
    ])
    expect(pageLinkIssuesIn(node, content('half'), addresses, LOCALES)).toEqual([
      { path: 'cta.en', pageId: 'half', reason: 'missingSlug' }
    ])
    expect(pageLinkIssuesIn(node, content('about'), addresses, LOCALES)).toEqual([])
  })
})
