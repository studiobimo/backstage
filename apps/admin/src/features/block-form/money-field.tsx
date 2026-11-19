import {
  isCurrencyCode,
  majorToMinor,
  minorToMajor,
  minorUnitDigits,
  MONEY
} from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts'
import { type FieldChromeProps, FieldFrame } from '@/components/form/fields'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/ui/number-field'
import { CONTROL_WIDTH } from '@/lib/content-width'

import { registrySettingsQuery } from '../settings/queries'

type MoneyFieldValue = number | undefined

function useSiteCurrency() {
  const { data } = useQuery(registrySettingsQuery)
  const saved = data?.settings[MONEY.settingKey]
  return isCurrencyCode(saved) ? saved : MONEY.fallbackCurrency
}

export function MoneyField({ description, ...chrome }: FieldChromeProps) {
  const { t, i18n } = useTranslation('blockForm')
  const field = useFieldContext<MoneyFieldValue>()
  const currency = useSiteCurrency()
  const stored = field.state.value
  return (
    <FieldFrame {...chrome} description={description ?? t('money.hint', { currency })}>
      <NumberField
        value={stored === undefined ? null : minorToMajor(stored, currency)}
        locale={i18n.language}
        format={{
          style: 'currency',
          currency,
          minimumFractionDigits: minorUnitDigits(currency)
        }}
        step={minorToMajor(1, currency)}
        onValueChange={(next) =>
          field.handleChange(next === null ? undefined : majorToMinor(next, currency))
        }
        className={CONTROL_WIDTH.amount}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput onBlur={field.handleBlur} />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </FieldFrame>
  )
}
