import { ImageIcon, LinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { type FieldChromeProps, FieldHeading } from '@/components/form/fields'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import { cn } from '@/lib/utils'

import { humanize } from './humanize.ts'
import { HexColorField } from './hex-color-field.tsx'
import { ImageField } from './image-field.tsx'
import { LinkField } from './link-field.tsx'
import { ListField } from './list-field.tsx'
import { MoneyField } from './money-field.tsx'
import { LocalizedField } from './localized-field.tsx'
import { ReferenceField } from './reference-field.tsx'
import { ScheduleField } from './schedule-field.tsx'
import { TimeOfDayField } from './time-of-day-field.tsx'
import { RichTextField } from './rich-text-field.tsx'
import type { FieldSpec, GroupSpec } from './spec.ts'
import { WeeklyHoursField } from './weekly-hours-field.tsx'
import type { BlockFormApi } from './validation.ts'
import { fieldName, type Path } from './value.ts'

export interface NodeProps<S extends FieldSpec = FieldSpec> {
  form: BlockFormApi
  spec: S
  path: Path
  label: string
  chrome?: Partial<FieldChromeProps>
  translated?: boolean
  icon?: ReactNode
}

function fieldLabel(t: TFunction<'blockForm'>, spec: FieldSpec, parent?: GroupSpec): string {
  if (spec.title) return spec.title
  if (parent?.variant) return t(`variants.${parent.variant}.${spec.key}`)
  return humanize(spec.key)
}

const variantIcon = { image: <ImageIcon />, link: <LinkIcon /> }

function LeafNode({ form, spec, path, label, chrome, translated, icon }: NodeProps) {
  const props = {
    label,
    description: spec.description,
    optional: !spec.required && !translated,
    ...chrome
  }
  const emptyValue = spec.required && !translated ? '' : undefined
  return (
    <form.AppField name={fieldName(path)}>
      {(field) => {
        switch (spec.kind) {
          case 'richText':
            return <RichTextField {...props} />
          case 'hexColor':
            return <HexColorField {...props} />
          case 'timeOfDay':
            return <TimeOfDayField {...props} />
          case 'money':
            return <MoneyField {...props} />
          case 'text':
            return (
              <field.TextField
                {...props}
                icon={icon}
                maxLength={spec.maxLength}
                emptyValue={emptyValue}
              />
            )
          case 'number':
            return (
              <field.NumberField
                {...props}
                min={spec.minimum}
                max={spec.maximum}
                integer={spec.integer}
              />
            )
          case 'boolean':
            return <field.SwitchField {...props} />
          case 'select':
            return (
              <field.SelectField
                {...props}
                options={spec.options.map((option) => ({ value: option, label: String(option) }))}
              />
            )
          default:
            return null
        }
      }}
    </form.AppField>
  )
}

interface GroupFieldsProps extends NodeProps<GroupSpec> {
  className?: string
}

export function GroupFields({ form, spec, path, translated, className }: GroupFieldsProps) {
  const { t } = useTranslation('blockForm')
  return (
    <div
      className={cn(
        'grid gap-5',
        path.length === 0 && 'gap-8',
        spec.variant && 'gap-3 sm:grid-cols-2',
        className
      )}
    >
      {spec.fields.map((field, index) => (
        <FieldNode
          key={field.key}
          form={form}
          spec={field}
          path={[...path, field.key]}
          label={fieldLabel(t, field, spec)}
          translated={translated}
          icon={spec.variant && index === 0 ? variantIcon[spec.variant] : undefined}
        />
      ))}
    </div>
  )
}

function GroupLegend({
  label,
  badge,
  optional
}: {
  label: string
  badge?: ReactNode
  optional?: boolean
}) {
  return (
    <FieldsetLegend className="mb-1 w-full">
      <FieldHeading legend label={label} badge={badge} optional={optional} />
    </FieldsetLegend>
  )
}

const COMPACT_KINDS: readonly FieldSpec['kind'][] = [
  'number',
  'money',
  'timeOfDay',
  'select',
  'boolean'
]
const COMPACT_GRID = 'grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-4'

const isCompact = (spec: GroupSpec) =>
  spec.fields.length > 1 && spec.fields.every((field) => COMPACT_KINDS.includes(field.kind))

function GroupNode(props: NodeProps<GroupSpec>) {
  const { spec, label, chrome } = props
  return (
    <Fieldset className="flex w-full max-w-none flex-col gap-4">
      <GroupLegend
        label={label}
        badge={chrome?.badge}
        optional={chrome?.optional ?? (!spec.required && !props.translated)}
      />
      {spec.description && (
        <p className="-mt-2.5 text-muted-foreground text-xs">{spec.description}</p>
      )}
      <GroupFields {...props} className={isCompact(spec) ? COMPACT_GRID : undefined} />
      {chrome?.footer}
    </Fieldset>
  )
}

export function FieldNode(props: NodeProps) {
  const { spec } = props
  switch (spec.kind) {
    case 'group':
      if (spec.variant === 'image') return <ImageField {...props} spec={spec} />
      if (spec.variant === 'link' && spec.acceptsPage) return <LinkField {...props} spec={spec} />
      return <GroupNode {...props} spec={spec} />
    case 'weeklyHours':
      return <WeeklyHoursField {...props} spec={spec} />
    case 'schedule':
      return <ScheduleField {...props} spec={spec} />
    case 'list':
      return <ListField {...props} spec={spec} />
    case 'localized':
      return <LocalizedField {...props} spec={spec} />
    case 'reference':
      return <ReferenceField {...props} spec={spec} />
    default:
      return <LeafNode {...props} />
  }
}
