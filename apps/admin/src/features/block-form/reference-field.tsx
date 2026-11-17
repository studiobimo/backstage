import { REFERENCE, type EntryReferenceValue } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { FieldHeading } from '@/components/form/fields'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import {
  NumberField as NumberFieldRoot,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/ui/number-field'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

import type { NodeProps } from './field-node.tsx'
import { ChosenEntries } from './reference-chosen.tsx'
import type { ReferenceSpec } from './spec.ts'
import { referenceOf } from './reference-value.ts'
import { fieldName } from './value.ts'
import { CONTROL_WIDTH } from '@/lib/content-width'

const DEFAULT_LATEST_COUNT = 3

const limitOf = ({ max }: ReferenceSpec) => max ?? REFERENCE.limits.maxItems

function LatestCount({
  spec,
  count,
  onChange
}: {
  spec: ReferenceSpec
  count: number
  onChange: (next: EntryReferenceValue) => void
}) {
  const { t } = useTranslation('blockForm')
  return (
    <div className="flex flex-col gap-2">
      <NumberFieldRoot
        value={count}
        min={REFERENCE.limits.minCount}
        max={limitOf(spec)}
        step={1}
        onValueChange={(next) =>
          onChange({
            mode: REFERENCE.mode.latest,
            count: next ?? REFERENCE.limits.minCount
          })
        }
        className={CONTROL_WIDTH.compact}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label={t('reference.latestCount')} />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberFieldRoot>
      <p className="text-muted-foreground text-xs">{t('reference.latestHint')}</p>
    </div>
  )
}

interface ReferenceBodyProps {
  spec: ReferenceSpec
  label: string
  value: EntryReferenceValue
  onChange: (next: EntryReferenceValue) => void
}

function ReferenceBody({ spec, label, value, onChange }: ReferenceBodyProps) {
  const { t } = useTranslation('blockForm')
  const max = limitOf(spec)
  const switchMode = (mode: string) =>
    onChange(
      mode === REFERENCE.mode.latest
        ? { mode: REFERENCE.mode.latest, count: Math.min(DEFAULT_LATEST_COUNT, max) }
        : { mode: REFERENCE.mode.chosen, ids: [] }
    )
  return (
    <Fieldset className="flex w-full max-w-none flex-col gap-3">
      <FieldsetLegend className="mb-1 w-full">
        <FieldHeading legend label={label} optional={!spec.required} />
      </FieldsetLegend>
      {spec.description && (
        <p className="-mt-2 text-muted-foreground text-xs">{spec.description}</p>
      )}
      <Tabs value={value.mode} onValueChange={switchMode}>
        <TabsList aria-label={t('reference.modeLabel')} className="w-full text-muted-foreground">
          <TabsTab value={REFERENCE.mode.chosen} className="flex-1">
            {t('reference.chosen')}
          </TabsTab>
          <TabsTab value={REFERENCE.mode.latest} className="flex-1">
            {t('reference.latest')}
          </TabsTab>
        </TabsList>
        <TabsPanel value={REFERENCE.mode.chosen} className="pt-4">
          {value.mode === REFERENCE.mode.chosen && (
            <ChosenEntries
              collection={spec.collection}
              ids={value.ids}
              max={max}
              onChange={(ids) => onChange({ mode: REFERENCE.mode.chosen, ids })}
            />
          )}
        </TabsPanel>
        <TabsPanel value={REFERENCE.mode.latest} className="pt-4">
          {value.mode === REFERENCE.mode.latest && (
            <LatestCount spec={spec} count={value.count} onChange={onChange} />
          )}
        </TabsPanel>
      </Tabs>
    </Fieldset>
  )
}

export function ReferenceField({ form, spec, path, label }: NodeProps<ReferenceSpec>) {
  return (
    <form.AppField name={fieldName(path)}>
      {(field) => (
        <ReferenceBody
          spec={spec}
          label={label}
          value={referenceOf(field.state.value)}
          onChange={(next) => field.handleChange(next)}
        />
      )}
    </form.AppField>
  )
}
