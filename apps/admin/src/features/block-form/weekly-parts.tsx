import type { ReactNode } from 'react'
import { useId } from 'react'

import { useFieldContext } from '@/components/form/contexts.ts'
import { useFieldError } from '@/components/form/field-error.ts'
import { FieldsetLegend } from '@/components/ui/fieldset'
import { Group, GroupSeparator, GroupText } from '@/components/ui/group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function TimeInput({ label, day }: { label: string; day: string }) {
  const field = useFieldContext<string | undefined>()
  const id = useId()
  const message = useFieldError()
  return (
    <Group>
      <GroupText className="w-16 justify-center" render={<Label htmlFor={id} />}>
        {label}
      </GroupText>
      <GroupSeparator />
      <Input
        id={id}
        type="time"
        size="sm"
        aria-label={`${day}, ${label}`}
        aria-invalid={message ? true : undefined}
        className="w-28 tabular-nums"
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </Group>
  )
}

export function WeekHeader({ label, description }: { label: string; description?: ReactNode }) {
  return (
    <>
      <FieldsetLegend className="w-full">
        <span className="font-medium text-base/4.5 sm:text-sm/4">{label}</span>
      </FieldsetLegend>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </>
  )
}
