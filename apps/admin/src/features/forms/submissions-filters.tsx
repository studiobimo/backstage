import { useTranslation } from 'react-i18next'

import { OptionSelect } from '@/components/choice-select'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CONTROL_WIDTH } from '@/lib/content-width'

import { fieldLabel, statusLabel } from './form-text'
import type { FormOption, SubmissionFilter } from './queries'

const ALL_STATUSES = ''

interface SubmissionsFiltersProps {
  form: FormOption
  filter: SubmissionFilter
  onChange: (filter: SubmissionFilter) => void
}

function DateInput({
  label,
  value,
  onChange
}: {
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  return (
    <Field className="sm:w-44">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="date"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </Field>
  )
}

export function SubmissionsFilters({ form, filter, onChange }: SubmissionsFiltersProps) {
  const { t, i18n } = useTranslation('forms')
  const options = [
    { value: ALL_STATUSES, label: t('filters.allStatuses') },
    ...form.statuses.map((status) => ({ value: status, label: statusLabel(i18n, t, status) }))
  ]
  const dateLabel = form.dateField
    ? fieldLabel(form.dateField, form.schema.properties?.[form.dateField])
    : ''
  const active = Boolean(filter.status || filter.from || filter.to)
  return (
    <div role="group" aria-label={t('filters.label')} className="flex flex-wrap items-end gap-3">
      <Field className="sm:w-44">
        <FieldLabel>{t('filters.status')}</FieldLabel>
        <OptionSelect
          label={t('filters.status')}
          value={filter.status ?? ALL_STATUSES}
          options={options}
          className={CONTROL_WIDTH.compact}
          onChange={(status) => onChange({ ...filter, status: status || undefined })}
        />
      </Field>
      {form.dateField && (
        <>
          <DateInput
            label={t('filters.from', { field: dateLabel })}
            value={filter.from}
            onChange={(from) => onChange({ ...filter, from })}
          />
          <DateInput
            label={t('filters.to', { field: dateLabel })}
            value={filter.to}
            onChange={(to) => onChange({ ...filter, to })}
          />
        </>
      )}
      {active && (
        <Button variant="ghost" onClick={() => onChange({})}>
          {t('filters.clear')}
        </Button>
      )}
    </div>
  )
}
