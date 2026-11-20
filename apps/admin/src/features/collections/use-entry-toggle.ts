import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'

import { humanize } from '../block-form/humanize'
import { useLocaleConfig } from '../config/queries'
import { entryLabelText } from './collection-text'
import { toggleEntryMutation, type CollectionOption } from './queries'
import type { useDependentsOutcome } from './use-entry-dependents'

const TOGGLE = { acknowledgedKey: 'backstage:entry-toggle-acknowledged' } as const

const readAcknowledged = () => {
  try {
    return localStorage.getItem(TOGGLE.acknowledgedKey) !== null
  } catch {
    return false
  }
}

const storeAcknowledged = () => {
  try {
    localStorage.setItem(TOGGLE.acknowledgedKey, 'true')
  } catch {
    return
  }
}

export interface ToggleField {
  key: string
  label: string
}

export const toggleFieldsOf = (collection: CollectionOption): ToggleField[] =>
  (collection.quickToggle ?? []).map((key) => ({
    key,
    label: collection.schema.properties?.[key]?.title ?? humanize(key)
  }))

interface ToggleRequest {
  entry: EntrySummary
  field: ToggleField
  value: boolean
}

export interface EntryToggleControl {
  fields: ToggleField[]
  pendingKey: string | null
  request: (entry: EntrySummary, field: ToggleField, value: boolean) => void
  asking: ToggleRequest | null
  confirm: () => void
  dismiss: () => void
}

export const toggleKey = (entryId: string, field: string) => `${entryId}:${field}`

export function useEntryToggle(
  collection: string,
  fields: ToggleField[],
  outcome: ReturnType<typeof useDependentsOutcome>
): EntryToggleControl {
  const { t, i18n } = useTranslation('collections')
  const { defaultLocale } = useLocaleConfig()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState<ToggleRequest | null>(null)
  const mutation = useMutation({
    ...toggleEntryMutation(queryClient, collection),
    onSuccess: ({ entry, republish, writes }, change) => {
      outcome.report(republish)
      const field = fields.find(({ key }) => key === change.field)?.label ?? change.field
      const name = entryLabelText(entry.label, i18n.language, defaultLocale) || t('list.untitled')
      const published = entry.publishedAt !== null
      toastManager.add({
        type: 'success',
        title: published
          ? t(change.value ? 'toggle.publishedOn' : 'toggle.publishedOff', {
              field,
              name,
              count: writes + republish.writes
            })
          : t(change.value ? 'toggle.draftOn' : 'toggle.draftOff', { field, name })
      })
    },
    onError: () => toastManager.add({ type: 'error', title: t('toggle.failed') })
  })
  const run = ({ entry, field, value }: ToggleRequest) =>
    mutation.mutate({
      id: entry.id,
      field: field.key,
      value,
      expectedVersion: entry.version
    })
  const request = (entry: EntrySummary, field: ToggleField, value: boolean) => {
    const next = { entry, field, value }
    if (readAcknowledged()) run(next)
    else setAsking(next)
  }
  return {
    fields,
    pendingKey: mutation.isPending
      ? toggleKey(mutation.variables.id, mutation.variables.field)
      : null,
    request,
    asking,
    confirm: () => {
      if (!asking) return
      storeAcknowledged()
      run(asking)
      setAsking(null)
    },
    dismiss: () => setAsking(null)
  }
}
