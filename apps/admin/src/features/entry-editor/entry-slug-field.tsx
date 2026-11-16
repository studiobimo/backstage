import { entryPathOf, type CollectionRoute } from '@studiobimo/backstage/internal'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

interface EntrySlugFieldProps {
  route: CollectionRoute
  locale: string
  defaultLocale: string
  value: string
  onChange: (slug: string) => void
}

export function EntrySlugField({
  route,
  locale,
  defaultLocale,
  value,
  onChange
}: EntrySlugFieldProps) {
  const { t } = useTranslation('entryEditor')
  const id = useId()
  return (
    <Field name={`slugs.${locale}`} className="w-full">
      <FieldLabel htmlFor={id}>{t('slug')}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <span className="font-mono">{entryPathOf(route, '', locale, defaultLocale)}</span>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </InputGroup>
      <FieldDescription>{t('slugHint')}</FieldDescription>
    </Field>
  )
}
