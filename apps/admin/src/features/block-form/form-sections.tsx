import type { ReactNode } from 'react'

import { GroupFields } from './field-node.tsx'
import type { FieldSpec, GroupSpec } from './spec.ts'
import type { BlockFormApi } from './validation.ts'

export interface FormSection {
  id: string
  title: string
  description?: string
  icon: ReactNode
  fields?: readonly string[]
  group?: string
}

interface SectionedFieldsProps {
  form: BlockFormApi
  root: GroupSpec
  sections: readonly FormSection[]
}

const FIELD_SPACING = 'gap-8'

function targetOf(root: GroupSpec, { group, fields = [] }: FormSection) {
  const wanted = root.fields.find((field) => field.key === group)
  if (wanted?.kind === 'group') return { spec: wanted, path: [wanted.key] }
  return {
    spec: { ...root, fields: root.fields.filter((field) => fields.includes(field.key)) },
    path: []
  }
}

const claimedKeys = (sections: readonly FormSection[]) =>
  new Set(sections.flatMap(({ group, fields = [] }) => (group ? [group] : fields)))

const unclaimed = (root: GroupSpec, sections: readonly FormSection[]): FieldSpec[] => {
  const claimed = claimedKeys(sections)
  return root.fields.filter((field) => !claimed.has(field.key))
}

function SectionHeading({ section }: { section: FormSection }) {
  return (
    <header className="flex items-start gap-4 xl:flex-col xl:gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs/5 [&_svg]:size-5"
      >
        {section.icon}
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 id={`section-${section.id}`} className="text-xl">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-muted-foreground text-sm">{section.description}</p>
        )}
      </div>
    </header>
  )
}

function Section({ form, root, section }: SectionedFieldsProps & { section: FormSection }) {
  const { spec, path } = targetOf(root, section)
  return (
    <section
      aria-labelledby={`section-${section.id}`}
      className="grid gap-6 border-t pt-10 first:border-t-0 first:pt-0 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-12"
    >
      <SectionHeading section={section} />
      <GroupFields form={form} spec={spec} path={path} label="" className={FIELD_SPACING} />
    </section>
  )
}

export function SectionedFields({ form, root, sections }: SectionedFieldsProps) {
  const rest = unclaimed(root, sections)
  return (
    <div className="flex flex-col gap-10">
      {sections.map((section) => (
        <Section key={section.id} form={form} root={root} section={section} sections={sections} />
      ))}
      {rest.length > 0 && (
        <GroupFields
          form={form}
          spec={{ ...root, fields: rest }}
          path={[]}
          label=""
          className={FIELD_SPACING}
        />
      )}
    </div>
  )
}
