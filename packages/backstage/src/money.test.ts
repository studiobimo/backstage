import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { classifyField, type SchemaNode } from './field-shapes.ts'
import {
  CURRENCY_CODES,
  currency,
  currencySettingSchema,
  formatMoney,
  isCurrencyCode,
  majorToMinor,
  minorToMajor,
  minorUnitDigits,
  money,
  MONEY
} from './money.ts'

describe('money field', () => {
  it('stores whole minor units and refuses fractions', () => {
    expect(money().parse(1999)).toBe(1999)
    expect(money().safeParse(19.99).success).toBe(false)
    expect(money().safeParse('1999').success).toBe(false)
  })

  it('is marked so the admin renders a money editor', () => {
    const node = z.toJSONSchema(z.object({ price: money() })).properties?.price as SchemaNode
    expect(classifyField(node)).toBe('money')
  })
})

describe('supported currencies', () => {
  it('starts with USD and HNL', () => {
    expect(CURRENCY_CODES).toEqual(['USD', 'HNL'])
  })

  it('declares the digits Intl uses for each currency', () => {
    for (const code of CURRENCY_CODES) {
      const { maximumFractionDigits } = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code
      }).resolvedOptions()
      expect(minorUnitDigits(code)).toBe(maximumFractionDigits)
    }
  })

  it('recognises only supported codes', () => {
    expect(isCurrencyCode('HNL')).toBe(true)
    expect(isCurrencyCode('EUR')).toBe(false)
    expect(isCurrencyCode(undefined)).toBe(false)
  })

  it('defaults a currency setting to the fallback and accepts the others', () => {
    expect(currency().parse(undefined)).toBe(MONEY.fallbackCurrency)
    expect(currency().parse('HNL')).toBe('HNL')
    expect(currencySettingSchema.safeParse({ currency: 'EUR' }).success).toBe(false)
  })
})

describe('minor and major units', () => {
  it('converts both ways without drifting', () => {
    expect(minorToMajor(1999, 'USD')).toBe(19.99)
    expect(majorToMinor(19.99, 'USD')).toBe(1999)
    expect(majorToMinor(0.29, 'HNL')).toBe(29)
  })
})

describe('formatMoney', () => {
  it('formats USD for the locale', () => {
    expect(formatMoney(123450, 'USD', 'en')).toBe('$1,234.50')
    expect(formatMoney(12345600, 'USD', 'es')).toMatch(/123.456,00/)
  })

  it('formats HNL', () => {
    const formatted = formatMoney(123450, 'HNL', 'en')
    expect(formatted).toContain('1,234.50')
    expect(formatted).toContain('HNL')
  })

  it('formats zero and negative amounts', () => {
    expect(formatMoney(0, 'USD', 'en')).toBe('$0.00')
    expect(formatMoney(-500, 'USD', 'en')).toBe('-$5.00')
  })
})
