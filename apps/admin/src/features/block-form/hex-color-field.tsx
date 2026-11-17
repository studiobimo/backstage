import { HEX_COLOR } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts'
import { type FieldChromeProps, FieldFrame } from '@/components/form/fields'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

type HexColorFieldValue = string | undefined

export function HexColorField(chrome: FieldChromeProps) {
  const { t } = useTranslation('blockForm')
  const field = useFieldContext<HexColorFieldValue>()
  const value = field.state.value ?? ''
  const swatch = HEX_COLOR.pattern.test(value.trim()) ? value.trim() : undefined
  return (
    <FieldFrame {...chrome}>
      <InputGroup>
        <InputGroupAddon>
          <span
            aria-hidden
            data-slot="color-swatch"
            className="size-5 rounded-sm border bg-muted sm:size-4"
            style={{ backgroundColor: swatch }}
          />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          placeholder={t('hexColor.placeholder')}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          onBlur={field.handleBlur}
          onChange={(event) =>
            field.handleChange(event.target.value === '' ? undefined : event.target.value)
          }
        />
      </InputGroup>
    </FieldFrame>
  )
}
