import { describe, expect, it } from 'vitest'

import { PAGE } from '../pages.ts'
import { parseRoute, pathOf, routeOf } from './routing.ts'

describe('routing', () => {
  it.each([
    ['/', { locale: 'en', slug: null }],
    ['/about', { locale: 'en', slug: 'about' }],
    ['/es', { locale: 'es', slug: null }],
    ['/es/nosotros', { locale: 'es', slug: 'nosotros' }]
  ])('parses %s', (path, route) => {
    expect(parseRoute(path)).toEqual(route)
  })

  it.each([
    '/en',
    '/en/about',
    '/a/b',
    '/es/a/b',
    '/wp-login.php',
    '/.env',
    '/About',
    '/about_us',
    '/-about',
    '/about%20us',
    '/es/xmlrpc.php',
    `/${'a'.repeat(PAGE.slug.maxLength + 1)}`
  ])('rejects %s', (path) => {
    expect(parseRoute(path)).toBeNull()
  })

  it('reads the route from a plain Request', () => {
    expect(routeOf(new Request('https://example.com/es/nosotros?x=1'))).toEqual({
      locale: 'es',
      slug: 'nosotros'
    })
  })

  it('reads no route from a path whose slug cannot exist', () => {
    expect(routeOf(new Request('https://example.com/wp-login.php?x=1'))).toBeNull()
  })

  it('writes a path back from a route', () => {
    expect(pathOf({ locale: 'en', slug: null })).toBe('/')
    expect(pathOf({ locale: 'en', slug: 'about' })).toBe('/about')
    expect(pathOf({ locale: 'es', slug: null })).toBe('/es')
    expect(pathOf({ locale: 'es', slug: 'nosotros' })).toBe('/es/nosotros')
  })
})
