import { useEffect, useMemo, useState } from 'react'

import { localeStatus } from '../block-form/locale-status'
import { type JsonSchema, parseBlockSchema } from '../block-form/spec'
import { blockValidator } from '../block-form/validation'
import type { BlockValue } from '../block-form/value'
import { localeOfIssue } from '@/lib/api-feedback'
import { useLocaleConfig } from '../config/queries'
import { SAVE_OUTCOME, type SaveOutcome, useSettingsHost } from './settings-host'
import { useReloadLatest, useSaveFeedback } from './use-save-feedback'
import type { QueryKey } from '@tanstack/react-query'

interface SectionOptions {
  id: string
  title: string
  schema: JsonSchema
  saved: BlockValue | undefined
  queryKey: QueryKey
  persist: (value: BlockValue) => Promise<unknown>
}

function useParsedSchema(schema: JsonSchema) {
  return useMemo(() => {
    try {
      return { root: parseBlockSchema(schema), validator: blockValidator(schema) }
    } catch {
      return undefined
    }
  }, [schema])
}

export function useSection({ id, title, schema, saved, queryKey, persist }: SectionOptions) {
  const host = useSettingsHost()
  const { locales } = useLocaleConfig()
  const parsed = useParsedSchema(schema)
  const [value, setValue] = useState<BlockValue>()
  const [dirty, setDirty] = useState(false)
  const feedback = useSaveFeedback(persist)
  const { generation, reload } = useReloadLatest(queryKey, feedback.clearStale)

  const missing = useMemo(() => {
    if (!parsed) return {}
    const status = localeStatus(parsed.root, value ?? saved ?? {}, [], locales)
    return Object.fromEntries(locales.map((locale) => [locale, status[locale]?.missing ?? 0]))
  }, [parsed, value, saved, locales])

  const { report, showLocale } = host
  useEffect(() => {
    report(id, { dirty, missing })
  }, [report, id, dirty, missing])
  useEffect(() => () => report(id, undefined), [report, id])

  const refusedLocale = feedback.issues.map((issue) => localeOfIssue(issue, locales)).find(Boolean)
  useEffect(() => {
    if (refusedLocale) showLocale(refusedLocale)
  }, [refusedLocale, showLocale])

  async function save(): Promise<SaveOutcome> {
    if (value === undefined) return SAVE_OUTCOME.skipped
    const result = parsed?.validator.safeParse(value)
    if (result && !result.success) {
      const invalidLocale = result.error.issues
        .flatMap((issue) => issue.path.map(String))
        .find((segment) => locales.includes(segment))
      if (invalidLocale) showLocale(invalidLocale)
      return SAVE_OUTCOME.failed
    }
    return feedback.submit(value)
  }

  host.register(id, { title, save })

  const form = {
    value: saved,
    onChange: setValue,
    onDirtyChange: setDirty,
    issues: feedback.issues,
    locales
  }
  return { ...feedback, form, value, reload, generation }
}
