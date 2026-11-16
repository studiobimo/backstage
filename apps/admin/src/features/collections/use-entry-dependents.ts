import type { EntryDependents, RepublishEntry } from '@studiobimo/backstage/internal'
import { useQuery, type UseMutationOptions } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'

import { republishStatusQuery } from '../pages/republish-queries'
import { entryRun, NEW_RUN } from '../pages/republish-run'

export interface PendingRun {
  total: number
  cursor: string | null
}

export function useDependentsNote(entry: RepublishEntry | undefined, enabled: boolean) {
  const { t } = useTranslation('entryEditor')
  const scope = entry ? entryRun(entry) : NEW_RUN
  const status = useQuery(republishStatusQuery(scope, enabled && entry !== undefined)).data
  if (!status || status.remaining === 0) return undefined
  return t('dependents.note', { count: status.remaining, writes: status.writes })
}

export function useDependentsOutcome() {
  const { t } = useTranslation('entryEditor')
  const [pending, setPending] = useState<PendingRun | null>(null)
  const report = ({ pages, pending: unfinished, batch }: EntryDependents) => {
    if (unfinished) {
      setPending({ total: batch?.remaining ?? pages, cursor: batch?.cursor ?? null })
    } else if (pages > 0) {
      toastManager.add({ type: 'success', title: t('dependents.updated', { count: pages }) })
    }
    return unfinished
  }
  return { pending, report, clear: () => setPending(null) }
}

export const reportingOutcome = <T extends { republish: EntryDependents }, V>(
  options: UseMutationOptions<T, Error, V>,
  report: (dependents: EntryDependents) => boolean
): UseMutationOptions<T, Error, V> => ({
  ...options,
  onSuccess: async (...args) => {
    await options.onSuccess?.(...args)
    report(args[0].republish)
  }
})
