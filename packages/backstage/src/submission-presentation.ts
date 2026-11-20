import { schemaNodeOf } from './blocks.ts'
import { classifyField, type SchemaNode } from './field-shapes.ts'
import { INBOX, type ReferencedEntries } from './form-inbox.ts'
import type { Form } from './forms.ts'
import { fieldTitle, type LabelledNode } from './labels.ts'
import { formatMoney, type CurrencyCode } from './money.ts'
import type { SubmissionStrings } from './submission-text.ts'
import { isBlank, isRecord, richTextPlain } from './translations.ts'

export type PresentedNode = SchemaNode & LabelledNode & { format?: string }

export interface PresentedColumn {
  key: string
  label: string
}

export type PresentedValue =
  | { kind: 'text'; text: string }
  | { kind: 'fields'; fields: PresentedField[] }
  | { kind: 'table'; columns: PresentedColumn[]; rows: string[][] }

export interface PresentedField {
  key: string
  label: string
  value: PresentedValue
}

export interface PresentationContext {
  language: string
  defaultLocale: string
  currency: CurrencyCode
  entries: ReferencedEntries
  strings: SubmissionStrings
}

export interface FieldScope {
  include?: readonly string[]
  exclude?: readonly string[]
}

const PLAIN_SEPARATOR = ', '
const LABEL_SEPARATOR = ': '

const textOf = (text: string): PresentedValue => ({ kind: 'text', text })

const childNodes = (node: PresentedNode) =>
  Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
    typeof child === 'boolean' ? [] : [[key, child as PresentedNode] as const]
  )

const itemNodeOf = (node: PresentedNode) =>
  node.items && !Array.isArray(node.items) && typeof node.items !== 'boolean'
    ? (node.items as PresentedNode)
    : undefined

const entryLabelIn = (
  label: Readonly<Record<string, string>>,
  language: string,
  defaultLocale: string
) =>
  label[language.split('-')[0] ?? language] ??
  label[defaultLocale] ??
  Object.values(label).find((text) => text !== '') ??
  ''

const dayText = (language: string, value: string) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`)
  )

const referenceText = (node: PresentedNode, value: unknown, context: PresentationContext) => {
  const ids = isRecord(value) && Array.isArray(value.ids) ? (value.ids as string[]) : []
  return ids
    .map((id) => {
      const label = context.entries[node.collection ?? '']?.[id]
      return (
        (label && entryLabelIn(label, context.language, context.defaultLocale)) ||
        context.strings.missingEntry
      )
    })
    .join(PLAIN_SEPARATOR)
}

const scalarText = (node: PresentedNode, value: unknown, context: PresentationContext) => {
  const shape = classifyField(node)
  if (typeof value === 'boolean') return value ? context.strings.yes : context.strings.no
  if (shape === 'reference') return referenceText(node, value, context)
  if (shape === 'richText') return richTextPlain(value)
  if (shape === 'money' && typeof value === 'number') {
    return formatMoney(value, context.currency, context.language)
  }
  if (typeof value === 'string') {
    return node.format === INBOX.dateFormat ? dayText(context.language, value) : value
  }
  return typeof value === 'number' ? String(value) : JSON.stringify(value)
}

export const plainTextOf = (value: PresentedValue): string => {
  if (value.kind === 'text') return value.text
  if (value.kind === 'fields') {
    return value.fields
      .filter((field) => plainTextOf(field.value) !== '')
      .map((field) => `${field.label}${LABEL_SEPARATOR}${plainTextOf(field.value)}`)
      .join(PLAIN_SEPARATOR)
  }
  return value.rows.map((row) => row.filter(Boolean).join(PLAIN_SEPARATOR)).join(PLAIN_SEPARATOR)
}

const fieldsOf = (
  node: PresentedNode,
  value: Record<string, unknown>,
  context: PresentationContext
): PresentedField[] =>
  childNodes(node).map(([key, child]) => ({
    key,
    label: fieldTitle(key, child, context.language, context.defaultLocale),
    value: presentValue(child, value[key], context)
  }))

const tableOf = (
  item: PresentedNode,
  rows: Record<string, unknown>[],
  context: PresentationContext
): PresentedValue => {
  const columns = fieldsOf(item, {}, context).map(({ key, label }) => ({ key, label }))
  return {
    kind: 'table',
    columns,
    rows: rows.map((row) =>
      columns.map(({ key }) => {
        const child = item.properties?.[key] as PresentedNode
        return plainTextOf(presentValue(child, row[key], context))
      })
    )
  }
}

const arrayValue = (node: PresentedNode, items: unknown[], context: PresentationContext) => {
  const item = itemNodeOf(node)
  if (item && classifyField(item) === 'object') {
    return tableOf(item, items.filter(isRecord), context)
  }
  return textOf(
    items
      .map((entry) => (item ? scalarText(item, entry, context) : String(entry)))
      .join(PLAIN_SEPARATOR)
  )
}

function presentValue(
  node: PresentedNode,
  value: unknown,
  context: PresentationContext
): PresentedValue {
  if (isBlank(value) && typeof value !== 'boolean') return textOf('')
  const shape = classifyField(node)
  if (shape === 'array' && Array.isArray(value)) return arrayValue(node, value, context)
  if (shape === 'object' && isRecord(value)) {
    return { kind: 'fields', fields: fieldsOf(node, value, context) }
  }
  return textOf(scalarText(node, value, context))
}

const inScope = (key: string, { include, exclude }: FieldScope) =>
  (!include || include.includes(key)) && !exclude?.includes(key)

export const presentSubmission = (
  form: Form,
  payload: Record<string, unknown>,
  context: PresentationContext,
  scope: FieldScope = {}
): PresentedField[] =>
  fieldsOf(schemaNodeOf(form.schema) as PresentedNode, payload, context).filter(({ key }) =>
    inScope(key, scope)
  )

export const formTitleIn = (form: Form, context: PresentationContext) =>
  (form.title && entryLabelIn(form.title, context.language, context.defaultLocale)) || form.name
