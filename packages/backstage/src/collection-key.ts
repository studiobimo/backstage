import { API_ERROR, type ApiError } from './errors.ts'
import { PAGE } from './pages.ts'
import { isRecord } from './translations.ts'

export const COLLECTION_KEY = {
  pattern: PAGE.slug.pattern,
  maxLength: PAGE.slug.maxLength,
  queryField: '$key'
} as const

export const jsonPathOf = (field: string) => `$."${field}"`

const isKey = (value: string) =>
  value.length <= COLLECTION_KEY.maxLength && COLLECTION_KEY.pattern.test(value)

export const keyOf = (collection: { key?: string }, content: unknown): string | null => {
  const value = collection.key && isRecord(content) ? content[collection.key] : undefined
  return typeof value === 'string' && value !== '' ? value : null
}

export const keyProblemOf = (
  collection: { key?: string },
  content: unknown,
  published?: unknown
): ApiError | null => {
  const key = keyOf(collection, content)
  if (key !== null && !isKey(key)) return API_ERROR.keyInvalid
  const live = published === undefined ? null : keyOf(collection, published)
  return published !== undefined && live !== key ? API_ERROR.keyLocked : null
}
