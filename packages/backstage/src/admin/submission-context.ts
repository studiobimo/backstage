import type { AnyD1Database } from 'drizzle-orm/d1'

import { schemaNodeOf } from '../blocks.ts'
import type { AdminRegistry } from '../collections.ts'
import { readEntryLabels } from '../db/entries.ts'
import { readRegistrySettings } from '../db/settings.ts'
import type { SchemaNode } from '../field-shapes.ts'
import type { ReferencedEntries } from '../form-inbox.ts'
import type { Form } from '../forms.ts'
import { resolveLocaleConfig } from '../locales.ts'
import { isCurrencyCode, MONEY } from '../money.ts'
import { REFERENCE, referenceFieldsIn } from '../references.ts'
import type { PresentationContext } from '../submission-presentation.ts'
import { submissionStringsFor } from '../submission-text.ts'

const readReferencedEntries = async (
  d1: AnyD1Database,
  form: Form,
  payloads: readonly Record<string, unknown>[]
): Promise<ReferencedEntries> => {
  const node = schemaNodeOf(form.schema) as SchemaNode
  const fields = payloads.flatMap((payload) => referenceFieldsIn(node, form.name, payload))
  const wanted = fields.flatMap(({ collection, value }) =>
    value.mode === REFERENCE.mode.chosen ? value.ids.map((id) => ({ collection, id })) : []
  )
  const found = await readEntryLabels(
    d1,
    wanted.map(({ id }) => id)
  )
  const entries: ReferencedEntries = {}
  for (const { collection, id } of wanted) {
    const entry = found.find((row) => row.id === id && row.collection === collection)
    if (entry) (entries[collection] ??= {})[id] = entry.label
  }
  return entries
}

const readSiteCurrency = async (d1: AnyD1Database) => {
  const saved = (await readRegistrySettings(d1)).settings[MONEY.settingKey]
  return isCurrencyCode(saved) ? saved : MONEY.fallbackCurrency
}

export const presentationContextFor = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  form: Form,
  payloads: readonly Record<string, unknown>[],
  language?: string
): Promise<PresentationContext> => {
  const { defaultLocale } = resolveLocaleConfig(registry)
  const [entries, currency] = await Promise.all([
    readReferencedEntries(d1, form, payloads),
    readSiteCurrency(d1)
  ])
  const chosen = language ?? defaultLocale
  return {
    language: chosen,
    defaultLocale,
    currency,
    entries,
    strings: submissionStringsFor(chosen)
  }
}
