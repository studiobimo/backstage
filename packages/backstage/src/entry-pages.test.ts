import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry } from './blocks.ts'
import { defineCollection } from './collections.ts'
import { deriveEntrySlug, entryPathOf, entryRoutePath, freeSlug, routesOf } from './entry-pages.ts'
import { parseEntryRoute } from './site/routing.ts'

const collectionAt = (path: string, name = 'blog') =>
  defineCollection({
    name,
    label: 'title',
    route: { path },
    schema: z.object({ title: z.string() })
  })

describe('a collection route', () => {
  it('accepts fixed segments followed by the slug', () => {
    expect(collectionAt('/blog/:slug').route).toEqual({ path: '/blog/:slug' })
    expect(collectionAt('/news/2026/:slug').route.path).toBe('/news/2026/:slug')
  })

  it.each([
    ['blog/:slug', 'start with a slash'],
    ['/blog/:id', 'end with :slug'],
    ['/:slug', 'at least one fixed segment'],
    ['/Blog/:slug', 'lowercase letters'],
    ['/blog/:slug/more', 'end with :slug'],
    ['/media/:slug', 'reserves'],
    ['/blog//:slug', 'lowercase letters']
  ])('refuses %s', (path, reason) => {
    expect(() => collectionAt(path)).toThrow(reason)
  })

  it('is refused by the registry when two collections share it or it starts with a locale', () => {
    const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
    expect(() =>
      defineRegistry([note], {
        collections: [collectionAt('/blog/:slug'), collectionAt('/blog/:slug', 'news')]
      })
    ).toThrow('both use the route')
    expect(() => defineRegistry([note], { collections: [collectionAt('/es/:slug')] })).toThrow(
      'starts with the locale "es"'
    )
  })

  it('leaves a collection without one unrouted', () => {
    const plain = defineCollection({
      name: 'faq',
      label: 'title',
      schema: z.object({ title: z.string() })
    })
    expect(plain.route).toBeUndefined()
    expect(routesOf([plain, collectionAt('/blog/:slug')])).toEqual({
      blog: { path: '/blog/:slug' }
    })
  })
})

describe('entry paths', () => {
  const route = { path: '/blog/:slug' }

  it('prefixes every locale but the default', () => {
    expect(entryRoutePath(route, 'hello')).toBe('blog/hello')
    expect(entryPathOf(route, 'hello', 'en', 'en')).toBe('/blog/hello')
    expect(entryPathOf(route, 'hola', 'es', 'en')).toBe('/es/blog/hola')
  })

  it('is parsed back to the collection, locale and slug', () => {
    const routes = routesOf([collectionAt('/blog/:slug'), collectionAt('/news/2026/:slug', 'news')])
    const locales = { locales: ['en', 'es'], defaultLocale: 'en' }
    expect(parseEntryRoute('/blog/hello', routes, locales)).toEqual({
      collection: 'blog',
      locale: 'en',
      slug: 'hello'
    })
    expect(parseEntryRoute('/es/news/2026/hola', routes, locales)).toEqual({
      collection: 'news',
      locale: 'es',
      slug: 'hola'
    })
    expect(parseEntryRoute('/en/blog/hello', routes, locales)).toBeNull()
    expect(parseEntryRoute('/blog/Hello', routes, locales)).toBeNull()
    expect(parseEntryRoute('/blog', routes, locales)).toBeNull()
    expect(parseEntryRoute('/news/hello', routes, locales)).toBeNull()
  })
})

describe('entry slugs', () => {
  it('derives from the locale label, falling back to the default locale', () => {
    const labels = { en: 'Big launch' }
    expect(deriveEntrySlug(labels, 'en', 'en')).toBe('big-launch')
    expect(deriveEntrySlug(labels, 'es', 'en')).toBe('big-launch')
    expect(deriveEntrySlug({ en: '???' }, 'en', 'en')).toBeNull()
    expect(deriveEntrySlug({}, 'en', 'en')).toBeNull()
  })

  it('takes the first free numbered variant', () => {
    expect(freeSlug('hello', new Set())).toBe('hello')
    expect(freeSlug('hello', new Set(['hello']))).toBe('hello-2')
    expect(freeSlug('hello', new Set(['hello', 'hello-2']))).toBe('hello-3')
  })
})
