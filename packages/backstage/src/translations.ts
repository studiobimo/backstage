import type { FieldKind } from './fields.ts'
import { LOCALES, type Locale, type PageSeo } from './pages.ts'

export type TranslatedNode =
  | boolean
  | {
      backstage?: string
      type?: string | string[]
      required?: string[]
      const?: unknown
      enum?: unknown[]
      anyOf?: TranslatedNode[]
      oneOf?: TranslatedNode[]
      properties?: Record<string, TranslatedNode>
      items?: TranslatedNode | TranslatedNode[]
      additionalProperties?: TranslatedNode
    }

export const isRecord = (value: unknown): value is { [key: string]: unknown } =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isRichText = (value: unknown) => isRecord(value) && value.type === 'doc'

export function richTextPlain(value: unknown): string {
  if (isRecord(value)) {
    const text = typeof value.text === 'string' ? value.text : ''
    return text + richTextPlain(value.content)
  }
  return Array.isArray(value) ? value.map(richTextPlain).join(' ').trim() : ''
}

export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (isRichText(value)) return richTextPlain(value) === ''
  if (Array.isArray(value)) return value.length === 0
  if (isRecord(value)) return Object.values(value).every(isBlank)
  return false
}

export function isMissingTranslation(translations: Record<string, unknown>, locale: string) {
  const filledElsewhere = Object.entries(translations).some(
    ([other, value]) => other !== locale && !isBlank(value)
  )
  return filledElsewhere && isBlank(translations[locale])
}

export interface MarkedField {
  path: string
  value: unknown
}

const childPath = (path: string, key: string) => (path === '' ? key : `${path}.${key}`)

const JSON_TYPE_CHECKS: Record<string, (value: unknown) => boolean> = {
  null: (value) => value === null,
  array: Array.isArray,
  object: isRecord,
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number',
  integer: Number.isInteger,
  boolean: (value) => typeof value === 'boolean'
}

const matchesType = ({ type }: Exclude<TranslatedNode, boolean>, value: unknown) =>
  type === undefined || [type].flat().some((name) => JSON_TYPE_CHECKS[name]?.(value) ?? true)

const matchesObjectShape = (
  { properties = {}, required = [] }: Exclude<TranslatedNode, boolean>,
  value: unknown
) =>
  !isRecord(value) ||
  (required.every((key) => key in value) &&
    Object.entries(properties).every(
      ([key, child]) =>
        typeof child === 'boolean' || !('const' in child) || value[key] === child.const
    ))

const fitsValue = (node: TranslatedNode, value: unknown): boolean =>
  typeof node === 'boolean' ||
  (matchesType(node, value) &&
    matchesObjectShape(node, value) &&
    (value === undefined ||
      [node.anyOf, node.oneOf].every(
        (branches) => !branches || branches.some((branch) => fitsValue(branch, value))
      )))

const firstPerPath = (fields: MarkedField[]) => [
  ...new Map(fields.map((field) => [field.path, field])).values()
]

export function markedFieldsIn(
  node: TranslatedNode,
  value: unknown,
  kind: FieldKind,
  path = ''
): MarkedField[] {
  if (typeof node === 'boolean') return []
  if (node.backstage === kind) return [{ path, value }]
  const branches = [...(node.anyOf ?? []), ...(node.oneOf ?? [])]
  const inBranches = branches
    .filter((branch) => fitsValue(branch, value))
    .flatMap((branch) => markedFieldsIn(branch, value, kind, path))
  return firstPerPath([...inBranches, ...markedFieldsInShape(node, value, kind, path)])
}

function markedFieldsInShape(
  node: Exclude<TranslatedNode, boolean>,
  value: unknown,
  kind: FieldKind,
  path: string
): MarkedField[] {
  const { items, properties = {}, additionalProperties } = node
  if (items && !Array.isArray(items)) {
    return Array.isArray(value)
      ? value.flatMap((item, index) => markedFieldsIn(items, item, kind, `${path}[${index}]`))
      : []
  }
  const record = isRecord(value) ? value : {}
  const extraKeys = additionalProperties === undefined ? [] : Object.keys(record)
  return [...new Set([...Object.keys(properties), ...extraKeys])].flatMap((key) => {
    const child = properties[key] ?? additionalProperties
    return child === undefined ? [] : markedFieldsIn(child, record[key], kind, childPath(path, key))
  })
}

const localizedEntries = (node: TranslatedNode, value: unknown) =>
  markedFieldsIn(node, value, 'localized').map((field) =>
    isRecord(field.value) ? field.value : {}
  )

export function countMissingTranslations(node: TranslatedNode, content: unknown, locale: string) {
  return localizedEntries(node, content).filter((entry) => isMissingTranslation(entry, locale))
    .length
}

export const isSeoMissing = (seo: PageSeo, locale: Locale) => {
  const isEmpty = ({ title, description }: PageSeo[Locale]) => title === '' && description === ''
  return isEmpty(seo[locale]) && LOCALES.some((other) => other !== locale && !isEmpty(seo[other]))
}

export type MissingByLocale = Record<Locale, number>
