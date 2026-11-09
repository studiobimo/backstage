import { isMissingTranslation } from '@studiobimo/backstage'
import { createContext, useContext } from 'react'

import type { FieldSpec, GroupSpec } from './spec.ts'
import { type BlockValue, type FieldValue, isRecord, type Path } from './value.ts'

export interface LocaleStatus {
  missing: number
  invalid: number
}

interface LocalizedEntry {
  path: Path
  value: BlockValue
}

function collectLocalized(
  spec: FieldSpec,
  value: FieldValue | undefined,
  path: Path
): LocalizedEntry[] {
  switch (spec.kind) {
    case 'localized':
      return [{ path, value: isRecord(value) ? value : {} }]
    case 'group':
      return spec.fields.flatMap((field) =>
        collectLocalized(field, isRecord(value) ? value[field.key] : undefined, [
          ...path,
          field.key
        ])
      )
    case 'list':
      return Array.isArray(value)
        ? value.flatMap((item, index) => collectLocalized(spec.item, item, [...path, index]))
        : []
    default:
      return []
  }
}

const startsWith = (path: Path, prefix: Path) =>
  prefix.every((segment, index) => path[index] === segment)

export function localeStatus(
  root: GroupSpec,
  value: BlockValue,
  issuePaths: readonly Path[],
  locales: readonly string[]
): Record<string, LocaleStatus> {
  const entries = collectLocalized(root, value, [])
  const statusOf = (locale: string): LocaleStatus => ({
    missing: entries.filter((entry) => isMissingTranslation(entry.value, locale)).length,
    invalid: issuePaths.filter((issuePath) =>
      entries.some((entry) => startsWith(issuePath, [...entry.path, locale]))
    ).length
  })
  return Object.fromEntries(locales.map((locale) => [locale, statusOf(locale)]))
}

export function hasLocalized(spec: FieldSpec): boolean {
  if (spec.kind === 'localized') return true
  if (spec.kind === 'group') return spec.fields.some(hasLocalized)
  if (spec.kind === 'list') return hasLocalized(spec.item)
  return false
}

export interface EditingLocale {
  locales: readonly string[]
  active: string
  fallback: string
}

export const EditingLocaleContext = createContext<EditingLocale>({
  locales: [],
  active: '',
  fallback: ''
})

export const useEditingLocale = () => useContext(EditingLocaleContext)

export function languageName(locale: string, uiLanguage: string): string {
  return new Intl.DisplayNames([uiLanguage], { type: 'language' }).of(locale) ?? locale
}
