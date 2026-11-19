import { classifyField, INBOX, type ReferencedEntries } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import type { JsonSchema } from '../block-form/spec'
import { entryLabelText } from '../collections/collection-text'
import { useLocaleConfig } from '../config/queries'
import { fieldEntries, fieldLabel, formatDay } from './form-text'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const referenceIds = (value: unknown) =>
  isRecord(value) && Array.isArray(value.ids) ? (value.ids as string[]) : []

interface ValueProps {
  node: JsonSchema
  value: unknown
  entries: ReferencedEntries
}

function Missing() {
  const { t } = useTranslation('forms')
  return <span className="text-muted-foreground">{t('detail.none')}</span>
}

function ReferenceValue({ node, value, entries }: ValueProps) {
  const { t, i18n } = useTranslation('forms')
  const { defaultLocale } = useLocaleConfig()
  const ids = referenceIds(value)
  if (ids.length === 0) return <Missing />
  return (
    <>
      {ids
        .map((id) => {
          const label = entries[node.collection ?? '']?.[id]
          return label
            ? entryLabelText(label, i18n.language, defaultLocale) || t('detail.missingEntry')
            : t('detail.missingEntry')
        })
        .join(', ')}
    </>
  )
}

function ObjectValue({ node, value, entries }: ValueProps) {
  const record = isRecord(value) ? value : {}
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1">
      {fieldEntries(node).map(([key, child]) => (
        <div key={key} className="flex gap-1.5">
          <dt className="text-muted-foreground">{fieldLabel(key, child)}</dt>
          <dd>
            <FieldValue node={child} value={record[key]} entries={entries} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ArrayValue({ node, value, entries }: ValueProps) {
  const items = Array.isArray(value) ? value : []
  if (items.length === 0 || !node.items) return <Missing />
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index}>
          <FieldValue node={node.items!} value={item} entries={entries} />
        </li>
      ))}
    </ul>
  )
}

function ScalarValue({ node, value }: Pick<ValueProps, 'node' | 'value'>) {
  const { t, i18n } = useTranslation('forms')
  if (typeof value === 'boolean') return <>{t(value ? 'detail.yes' : 'detail.no')}</>
  if (typeof value === 'string' && node.format === INBOX.dateFormat) {
    return <>{formatDay(i18n.language, value)}</>
  }
  return <>{typeof value === 'string' ? value : JSON.stringify(value)}</>
}

export function FieldValue(props: ValueProps) {
  const { node, value } = props
  if (value === undefined || value === null || value === '') return <Missing />
  const shape = classifyField(node)
  if (shape === 'reference') return <ReferenceValue {...props} />
  if (shape === 'object') return <ObjectValue {...props} />
  if (shape === 'array') return <ArrayValue {...props} />
  return <ScalarValue node={node} value={value} />
}
