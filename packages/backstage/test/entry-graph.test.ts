import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE_DIR = join(import.meta.dirname, '..')
const SRC = join(PACKAGE_DIR, 'src')
const IMPORT_SPECIFIER = /(?:from|import)\s*\(?\s*'([^']+)'/g
const RELATIVE_PREFIX = '.'
const MANIFEST = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')) as {
  exports: Record<string, string>
}

const KIND = {
  d1: /^db\/|^drizzle-orm(\/|$)/,
  hono: /^hono(\/|$)/
} as const

const FORBIDDEN_BY_ENTRY = {
  './internal': [KIND.d1, KIND.hono],
  './site': [KIND.d1, KIND.hono],
  './render': [KIND.d1, KIND.hono],
  './site/hono': [KIND.d1]
} as const

const specifiersOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!)

const reachableFrom = (entry: string) => {
  const reached = new Set<string>()
  const visit = (file: string) => {
    const name = relative(SRC, file)
    if (reached.has(name)) return
    reached.add(name)
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith(RELATIVE_PREFIX)) visit(resolve(file, '..', specifier))
      else reached.add(specifier)
    }
  }
  visit(resolve(PACKAGE_DIR, entry))
  return [...reached]
}

describe('what each entry can reach', () => {
  it.each(Object.entries(FORBIDDEN_BY_ENTRY))('%s', (entry, forbidden) => {
    const reached = reachableFrom(MANIFEST.exports[entry]!)
    expect(reached.length).toBeGreaterThan(1)
    for (const kind of forbidden) {
      expect(reached.filter((name) => kind.test(name))).toEqual([])
    }
  })

  it('the admin entry reaches the database code the others cannot', () => {
    const reached = reachableFrom(MANIFEST.exports['./admin']!)
    expect(reached.some((name) => KIND.d1.test(name))).toBe(true)
  })
})
