import { MediaPicker } from '../media/media-picker'
import { FieldHeading } from '@/components/form/fields'

import type { NodeProps } from './field-node.tsx'
import type { GroupSpec } from './spec.ts'
import { fieldName, isRecord, readValue } from './value.ts'

export function ImageField({ form, path, label, chrome, spec, translated }: NodeProps<GroupSpec>) {
  return (
    <form.AppField name={fieldName(path)}>
      {(field) => {
        const current = readValue(field.state.value)
        const id = isRecord(current) && typeof current.id === 'string' ? current.id : null
        return (
          <div className="flex flex-col gap-2">
            <FieldHeading
              {...chrome}
              label={label}
              optional={!spec.required && !translated}
              legend
            />
            <MediaPicker
              label={label}
              value={id}
              onChange={(next) => field.handleChange(next ? { id: next, alt: '' } : undefined)}
            />
          </div>
        )
      }}
    </form.AppField>
  )
}
