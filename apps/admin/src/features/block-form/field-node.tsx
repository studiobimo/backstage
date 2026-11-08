import { ImageIcon, LinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { type FieldChromeProps, FieldHeading } from '@/components/form/fields'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import { cn } from '@/lib/utils'

import { ListField } from './list-field.tsx'
import { LocalizedField } from './localized-field.tsx'
import { RichTextField } from './rich-text-field.tsx'
import type { FieldSpec, GroupSpec } from './spec.ts'
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

function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
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
    <div className={cn('grid gap-5', spec.variant && 'gap-3 sm:grid-cols-2', className)}>
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

function GroupNode(props: NodeProps<GroupSpec>) {
  const { spec, label, chrome } = props
  return (
    <Fieldset className="w-full max-w-none gap-3">
      <GroupLegend
        label={label}
        badge={chrome?.badge}
        optional={!spec.required && !props.translated}
      />
      {spec.description && <p className="text-muted-foreground text-xs">{spec.description}</p>}
      <GroupFields {...props} className="border-s ps-4" />
      {chrome?.footer}
    </Fieldset>
  )
}

export function FieldNode(props: NodeProps) {
  const { spec } = props
  switch (spec.kind) {
    case 'group':
      return <GroupNode {...props} spec={spec} />
    case 'list':
      return <ListField {...props} spec={spec} />
    case 'localized':
      return <LocalizedField {...props} spec={spec} />
    default:
      return <LeafNode {...props} />
  }
}
