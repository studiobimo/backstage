import { useTranslation } from 'react-i18next'

import { Fieldset } from '@/components/ui/fieldset'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import type { NodeProps } from './field-node.tsx'
import type { WeeklyHoursSpec } from './spec.ts'
import { weekdayName } from './weekday-name.ts'
import { TimeInput, WeekHeader } from './weekly-parts.tsx'
import { fieldName } from './value.ts'

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
      <WeekHeader label={label} description={spec.description} />
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
