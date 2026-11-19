import { z } from 'zod'

import { marked } from './fields.ts'

export const MONEY = {
  currencies: {
    USD: { minorUnitDigits: 2 },
    HNL: { minorUnitDigits: 2 }
  },
  settingKey: 'currency',
  fallbackCurrency: 'USD',
  radix: 10
} as const

export type CurrencyCode = keyof typeof MONEY.currencies

export const CURRENCY_CODES = Object.keys(MONEY.currencies) as [CurrencyCode, ...CurrencyCode[]]

const currencyCode = z.enum(CURRENCY_CODES)

export const currency = () => currencyCode.default(MONEY.fallbackCurrency)

export const currencySettingSchema = z.object({ [MONEY.settingKey]: currencyCode })

export const money = () => marked(z.number().int(), 'money')

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && Object.hasOwn(MONEY.currencies, value)

export const minorUnitDigits = (currencyOf: CurrencyCode) =>
  MONEY.currencies[currencyOf].minorUnitDigits

const scaleOf = (currencyOf: CurrencyCode) => MONEY.radix ** minorUnitDigits(currencyOf)

export const minorToMajor = (amount: number, currencyOf: CurrencyCode) =>
  amount / scaleOf(currencyOf)

export const majorToMinor = (amount: number, currencyOf: CurrencyCode) =>
  Math.round(amount * scaleOf(currencyOf))

export const formatMoney = (amount: number, currencyOf: CurrencyCode, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: currencyOf }).format(
    minorToMajor(amount, currencyOf)
  )
