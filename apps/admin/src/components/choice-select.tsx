import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ChoiceOption {
  value: string
  label: string
}

interface OptionSelectProps {
  label: string
  value: string
  options: readonly ChoiceOption[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function OptionSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  className
}: OptionSelectProps) {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next: string | null) => next !== null && onChange(next)}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

interface ChoiceSelectProps extends Omit<OptionSelectProps, 'className'> {
  description?: string
}

export function ChoiceSelect({ description, ...select }: ChoiceSelectProps) {
  return (
    <Field className="max-w-xs">
      <FieldLabel>{select.label}</FieldLabel>
      <OptionSelect {...select} />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
