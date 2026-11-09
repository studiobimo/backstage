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

function localizedEntries(node: TranslatedNode, value: unknown): Record<string, unknown>[] {
  if (typeof node === 'boolean') return []
  if (node.backstage === 'localized') return [isRecord(value) ? value : {}]
  const { items } = node
  if (items && !Array.isArray(items)) {
    return Array.isArray(value) ? value.flatMap((item) => localizedEntries(items, item)) : []
  }
  return Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
    localizedEntries(child, isRecord(value) ? value[key] : undefined)
  )
}

export function countMissingTranslations(node: TranslatedNode, content: unknown, locale: string) {
  return localizedEntries(node, content).filter((entry) => isMissingTranslation(entry, locale))
    .length
}

export const isSeoMissing = (seo: PageSeo, locale: Locale) => {
  const isEmpty = ({ title, description }: PageSeo[Locale]) => title === '' && description === ''
  return isEmpty(seo[locale]) && LOCALES.some((other) => other !== locale && !isEmpty(seo[other]))
}

export type MissingByLocale = Record<Locale, number>
