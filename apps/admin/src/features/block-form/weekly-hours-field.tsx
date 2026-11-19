import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts.ts'
import { useFieldError } from '@/components/form/field-error.ts'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import { Group, GroupSeparator, GroupText } from '@/components/ui/group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import type { NodeProps } from './field-node.tsx'
import type { WeeklyHoursSpec } from './spec.ts'
import { fieldName } from './value.ts'

const MONDAY_2024 = Date.UTC(2024, 0, 1)
const MS_PER_DAY = 86_400_000

const weekdayName = (language: string, index: number) => {
  const name = new Intl.DateTimeFormat(language, { weekday: 'long', timeZone: 'UTC' }).format(
    MONDAY_2024 + index * MS_PER_DAY
  )
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1)
}

function TimeInput({ label, day }: { label: string; day: string }) {
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

function DayRow({
  form,
  path,
  day,
  name
}: Pick<NodeProps, 'form' | 'path'> & {
  day: string
  name: string
}) {
  const { t } = useTranslation('blockForm')
  return (
    <form.AppField name={fieldName([...path, day, 'closed'])}>
      {(closed) => {
        const isOpen = closed.state.value !== true
        return (
          <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:min-h-14 sm:flex-row sm:items-center sm:gap-6">
            <Label className="flex h-8 shrink-0 items-center gap-2.5 sm:w-36">
              <Switch
                checked={isOpen}
                onCheckedChange={(checked) => closed.handleChange(!checked)}
              />
              {name}
            </Label>
            {isOpen ? (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <form.AppField name={fieldName([...path, day, 'opens'])}>
                  {() => <TimeInput label={t('weekly.from')} day={name} />}
                </form.AppField>
                <form.AppField name={fieldName([...path, day, 'closes'])}>
                  {() => <TimeInput label={t('weekly.to')} day={name} />}
                </form.AppField>
              </div>
            ) : (
              <p className="text-muted-foreground">{t('weekly.closed')}</p>
            )}
          </div>
        )
      }}
    </form.AppField>
  )
}

export function WeeklyHoursField({ form, spec, path, label }: NodeProps<WeeklyHoursSpec>) {
  const { i18n } = useTranslation()
  return (
    <Fieldset className="flex w-full max-w-none flex-col gap-3">
      <FieldsetLegend className="w-full">
        <span className="font-medium text-base/4.5 sm:text-sm/4">{label}</span>
      </FieldsetLegend>
      {spec.description && <p className="text-muted-foreground text-xs">{spec.description}</p>}
      <div className="divide-y">
        {spec.days.map((day, index) => (
          <DayRow
            key={day}
            form={form}
            path={path}
            day={day}
            name={weekdayName(i18n.language, index)}
          />
        ))}
      </div>
    </Fieldset>
  )
}
