import { currencySettingSchema, formatMoney, MONEY } from '../money.ts'
import { useLocale, useSettings } from './context.ts'

export function useMoney() {
  const locale = useLocale()
  const currency = useSettings(currencySettingSchema)?.[MONEY.settingKey] ?? MONEY.fallbackCurrency
  return (amount: number) => formatMoney(amount, currency, locale)
}
