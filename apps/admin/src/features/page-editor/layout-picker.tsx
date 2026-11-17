import { useTranslation } from 'react-i18next'

import { FrameSection } from '@/components/frame-section'
import { Field, FieldItem, FieldLabel } from '@/components/ui/field'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

type SchematicPart = 'header' | 'slimHeader' | 'footer'

const LAYOUT_SCHEMATIC: Record<string, readonly SchematicPart[]> = {
  default: ['header', 'footer'],
  minimal: ['slimHeader'],
  bare: []
}

const SCHEMATIC_FALLBACK = LAYOUT_SCHEMATIC.default!

const PART_CLASS: Record<SchematicPart, string> = {
  header: 'h-2.5 bg-muted-foreground/40',
  slimHeader: 'h-1 bg-muted-foreground/40',
  footer: 'h-2 bg-muted-foreground/40'
}

function LayoutSchematic({ name }: { name: string }) {
  const parts = LAYOUT_SCHEMATIC[name] ?? SCHEMATIC_FALLBACK
  const header = parts.find((part) => part === 'header' || part === 'slimHeader')
  const footer = parts.includes('footer')
  return (
    <span
      aria-hidden
      className="flex h-14 w-20 shrink-0 flex-col gap-1 overflow-hidden rounded-md border bg-background p-1"
    >
      {header && <span className={cn('rounded-xs', PART_CLASS[header])} />}
      <span className="flex-1 rounded-xs bg-muted" />
      {footer && <span className={cn('rounded-xs', PART_CLASS.footer)} />}
    </span>
  )
}

export function LayoutPicker({
  layouts,
  value,
  onChange
}: {
  layouts: string[]
  value: string
  onChange: (layout: string) => void
}) {
  const { t } = useTranslation('pageEditor')
  return (
    <FrameSection title={t('layout.label')} description={t('layout.description')}>
      <Field name="layout">
        <RadioGroup
          aria-label={t('layout.label')}
          className="grid w-full gap-3 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]"
          value={value}
          onValueChange={(next) => onChange(String(next))}
        >
          {layouts.map((name) => (
            <FieldItem key={name} className="min-w-0">
              <FieldLabel className="w-full items-start gap-2 rounded-lg border bg-background p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50">
                <Radio value={name} />
                <span className="flex flex-col gap-2">
                  <LayoutSchematic name={name} />
                  <span>{t(`layout.names.${name}`, { defaultValue: name })}</span>
                  <span className="text-muted-foreground text-xs">
                    {t(`layout.summaries.${name}`, { defaultValue: '' })}
                  </span>
                </span>
              </FieldLabel>
            </FieldItem>
          ))}
        </RadioGroup>
      </Field>
    </FrameSection>
  )
}
