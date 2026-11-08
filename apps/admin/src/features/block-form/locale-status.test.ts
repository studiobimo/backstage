import { describe, expect, it } from 'vitest'

import { hasLocalized, localeStatus } from './locale-status.ts'
import { parseBlockSchema } from './spec.ts'
import { everyKindSchema, locales } from './test-fixtures.ts'

const root = parseBlockSchema(everyKindSchema)

describe('localeStatus', () => {
  it('counts a field as missing where another locale is filled and this one is not', () => {
    const status = localeStatus(
      root,
      { title: { en: 'Hi' }, alt: { es: { href: '/hola' } } },
      [],
      locales
    )
    expect(status.en).toEqual({ missing: 1, invalid: 0 })
    expect(status.es).toEqual({ missing: 1, invalid: 0 })
  })

  it('does not count a field that no locale has filled', () => {
    expect(localeStatus(root, { title: {} }, [], locales).es.missing).toBe(0)
  })

  it('counts the issues that belong to each locale', () => {
    const status = localeStatus(root, { title: { es: '' } }, [['title', 'es'], ['slug']], locales)
    expect(status.es.invalid).toBe(1)
    expect(status.en.invalid).toBe(0)
  })

  it('knows whether a block has any localized field', () => {
    expect(hasLocalized(root)).toBe(true)
    expect(hasLocalized(parseBlockSchema({ type: 'object', properties: {} }))).toBe(false)
  })
})
