import { REFERENCE, type EntryReferenceValue } from '@studiobimo/backstage/internal'

import { isRecord, readValue } from './value.ts'

export function referenceOf(raw: unknown): EntryReferenceValue {
  const value = readValue(raw)
  if (isRecord(value) && value.mode === REFERENCE.mode.latest && typeof value.count === 'number') {
    return { mode: REFERENCE.mode.latest, count: value.count }
  }
  if (isRecord(value) && value.mode === REFERENCE.mode.query) {
    return value as EntryReferenceValue
  }
  const ids = isRecord(value) && Array.isArray(value.ids) ? value.ids : []
  return {
    mode: REFERENCE.mode.chosen,
    ids: ids.filter((id): id is string => typeof id === 'string')
  }
}
