import { useFieldContext } from '@/components/form/contexts'
import { type FieldChromeProps, FieldFrame } from '@/components/form/fields'
import { Input } from '@/components/ui/input'
import { CONTROL_WIDTH } from '@/lib/content-width'

type TimeOfDayFieldValue = string | undefined

export function TimeOfDayField(chrome: FieldChromeProps) {
  const field = useFieldContext<TimeOfDayFieldValue>()
  return (
    <FieldFrame {...chrome}>
      <Input
        type="time"
        className={`${CONTROL_WIDTH.compact} tabular-nums`}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(event.target.value === '' ? undefined : event.target.value)
        }
      />
    </FieldFrame>
  )
}
