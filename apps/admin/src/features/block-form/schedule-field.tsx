import { PlusIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts.ts'
import { Button } from '@/components/ui/button'
import { Fieldset } from '@/components/ui/fieldset'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { IconButton } from '@/components/icon-button'

import type { NodeProps } from './field-node.tsx'
import type { ScheduleSpec } from './spec.ts'
import { weekdayName } from './weekday-name.ts'
import { TimeInput, WeekHeader } from './weekly-parts.tsx'
import { fieldName, type Path } from './value.ts'

const SCHEDULE = {
  defaultRange: { open: '09:00', close: '17:00' },
  fields: { week: 'week', exceptions: 'exceptions', timeZone: 'timeZone' }
} as const

const timeZoneOptions = (current: string | undefined) => {
  const zones = new Set(Intl.supportedValuesOf('timeZone'))
  if (current) zones.add(current)
  return [...zones].map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }))
}

interface TimeRange {
  open: string
  close: string
}

interface ExceptionValue {
  date: string
  ranges: TimeRange[]
}

interface RangesRowProps extends Pick<NodeProps, 'form'> {
  path: Path
  name: string
  lead: (state: { isOpen: boolean; setOpen: (open: boolean) => void }) => ReactNode
  actions?: ReactNode
  addWhenClosed?: boolean
}

function RangesRow(props: RangesRowProps) {
  return (
    <props.form.AppField name={fieldName(props.path)} mode="array">
      {() => <RangesBody {...props} />}
    </props.form.AppField>
  )
}

function RangesBody({ form, path, name, lead, actions, addWhenClosed }: RangesRowProps) {
  const { t } = useTranslation('blockForm')
  const ranges = useFieldContext<TimeRange[] | undefined>()
  const count = ranges.state.value?.length ?? 0
  const setOpen = (open: boolean) =>
    open ? ranges.pushValue(SCHEDULE.defaultRange) : ranges.setValue([])
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <div className="sm:w-44 sm:shrink-0">{lead({ isOpen: count > 0, setOpen })}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {count === 0 && <p className="text-muted-foreground">{t('weekly.closed')}</p>}
        {Array.from({ length: count }, (_, index) => {
          const context = t('schedule.rangeOf', { day: name, number: index + 1 })
          return (
            <div key={index} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <form.AppField name={fieldName([...path, index, 'open'])}>
                {() => <TimeInput label={t('weekly.from')} day={context} />}
              </form.AppField>
              <form.AppField name={fieldName([...path, index, 'close'])}>
                {() => <TimeInput label={t('weekly.to')} day={context} />}
              </form.AppField>
              <IconButton
                label={t('schedule.removeRange', { day: name, number: index + 1 })}
                variant="ghost"
                onClick={() => ranges.removeValue(index)}
              >
                <Trash2Icon />
              </IconButton>
            </div>
          )
        })}
        {(count > 0 || addWhenClosed) && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => ranges.pushValue(SCHEDULE.defaultRange)}
            >
              <PlusIcon aria-hidden />
              {t('schedule.addRange', { day: name })}
            </Button>
          </div>
        )}
      </div>
      {actions}
    </div>
  )
}

function DateInput({ label }: { label: string }) {
  const field = useFieldContext<string | undefined>()
  return (
    <Input
      type="date"
      aria-label={label}
      value={field.state.value ?? ''}
      onBlur={field.handleBlur}
      onChange={(event) => field.handleChange(event.target.value)}
    />
  )
}

function Exceptions({ form, path }: Pick<NodeProps, 'form'> & { path: Path }) {
  const listPath = [...path, SCHEDULE.fields.exceptions]
  return (
    <form.AppField name={fieldName(listPath)} mode="array">
      {() => <ExceptionsBody form={form} path={listPath} />}
    </form.AppField>
  )
}

function ExceptionsBody({ form, path }: Pick<NodeProps, 'form'> & { path: Path }) {
  const { t } = useTranslation('blockForm')
  const list = useFieldContext<ExceptionValue[] | undefined>()
  const count = list.state.value?.length ?? 0
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h4 className="font-medium text-sm">{t('schedule.exceptions')}</h4>
        <p className="text-muted-foreground text-xs">{t('schedule.exceptionsHint')}</p>
      </div>
      <div className="divide-y">
        {Array.from({ length: count }, (_, index) => (
          <ExceptionRow
            key={index}
            form={form}
            path={[...path, index]}
            onRemove={() => list.removeValue(index)}
          />
        ))}
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => list.pushValue({ date: '', ranges: [] })}
        >
          <PlusIcon aria-hidden />
          {t('schedule.addException')}
        </Button>
      </div>
    </section>
  )
}

function ExceptionRow({
  form,
  path,
  onRemove
}: Pick<NodeProps, 'form'> & { path: Path; onRemove: () => void }) {
  const { t } = useTranslation('blockForm')
  const name = t('schedule.exceptionName', { number: Number(path.at(-1)) + 1 })
  return (
    <RangesRow
      form={form}
      path={[...path, 'ranges']}
      addWhenClosed
      name={name}
      lead={() => (
        <form.AppField name={fieldName([...path, 'date'])}>
          {() => <DateInput label={t('schedule.date', { name })} />}
        </form.AppField>
      )}
      actions={
        <IconButton
          label={t('schedule.removeException', { name })}
          variant="ghost"
          onClick={onRemove}
        >
          <Trash2Icon />
        </IconButton>
      }
    />
  )
}

export function ScheduleField({ form, spec, path, label }: NodeProps<ScheduleSpec>) {
  const { t, i18n } = useTranslation('blockForm')
  const weekPath = [...path, SCHEDULE.fields.week]
  return (
    <Fieldset className="flex w-full max-w-none flex-col gap-5">
      <WeekHeader label={label} description={spec.description} />
      <form.AppField name={fieldName([...path, SCHEDULE.fields.timeZone])}>
        {(field) => (
          <field.SelectField
            label={t('schedule.timeZone')}
            options={timeZoneOptions(field.state.value as string | undefined)}
          />
        )}
      </form.AppField>
      <div className="divide-y">
        {spec.days.map((day, index) => {
          const name = weekdayName(i18n.language, index)
          return (
            <RangesRow
              key={day}
              form={form}
              path={[...weekPath, day]}
              name={name}
              lead={({ isOpen, setOpen }) => (
                <Label className="flex h-8 items-center gap-2.5">
                  <Switch checked={isOpen} onCheckedChange={setOpen} />
                  {name}
                </Label>
              )}
            />
          )
        })}
      </div>
      <Exceptions form={form} path={path} />
    </Fieldset>
  )
}
