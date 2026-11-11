import { describe, expect, it } from 'vitest'

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

  it.each(['/en', '/en/about', '/a/b', '/es/a/b'])('rejects %s', (path) => {
    expect(parseRoute(path)).toBeNull()
  })

  it('reads the route from a plain Request', () => {
    expect(routeOf(new Request('https://example.com/es/nosotros?x=1'))).toEqual({
      locale: 'es',
      slug: 'nosotros'
    })
  })

  it('writes a path back from a route', () => {
    expect(pathOf({ locale: 'en', slug: null })).toBe('/')
    expect(pathOf({ locale: 'en', slug: 'about' })).toBe('/about')
    expect(pathOf({ locale: 'es', slug: null })).toBe('/es')
    expect(pathOf({ locale: 'es', slug: 'nosotros' })).toBe('/es/nosotros')
  })
})
