import { describe, expect, it } from 'vitest'

import { hasMultipleLocales, LOCALE, perLocaleKeys, resolveLocaleConfig } from './locales.ts'

describe('resolveLocaleConfig', () => {
  it('defaults to English and Spanish with English as the default', () => {
    expect(resolveLocaleConfig()).toEqual(LOCALE.default)
  })

  it('takes the first locale as the default when none is given', () => {
    expect(resolveLocaleConfig({ locales: ['es', 'en'] })).toEqual({
      locales: ['es', 'en'],
      defaultLocale: 'es'
    })
  })

  it('lists the default locale first', () => {
    expect(resolveLocaleConfig({ locales: ['en', 'es', 'fr'], defaultLocale: 'es' })).toEqual({
      locales: ['es', 'en', 'fr'],
      defaultLocale: 'es'
    })
  })

  it('accepts a single locale', () => {
    const config = resolveLocaleConfig({ locales: ['fr'] })
    expect(config.defaultLocale).toBe('fr')
    expect(hasMultipleLocales(config)).toBe(false)
  })

  it.each([
    [{ locales: [] }, /at least one/],
    [{ locales: ['en', 'en'] }, /not repeat/],
    [{ locales: ['EN'] }, /lowercase/],
    [{ locales: ['en', '../x'] }, /lowercase/],
    [{ locales: ['en', 'es'], defaultLocale: 'fr' }, /one of the site's locales/]
  ])('rejects %j', (options, message) => {
    expect(() => resolveLocaleConfig(options)).toThrow(message)
  })
})

describe('perLocaleKeys', () => {
  it('builds one entry for each locale', () => {
    expect(perLocaleKeys(['es', 'en'], (locale) => locale.length)).toEqual({ es: 2, en: 2 })
  })
})
