import type { FieldKind } from './fields.ts'
import { LOCALES, type Locale, type PageSeo } from './pages.ts'

export type TranslatedNode =
  | boolean
  | {
      backstage?: string
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

export function markedFieldsIn(
  node: TranslatedNode,
  value: unknown,
  kind: FieldKind,
  path = ''
): MarkedField[] {
  if (typeof node === 'boolean') return []
  if (node.backstage === kind) return [{ path, value }]
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
