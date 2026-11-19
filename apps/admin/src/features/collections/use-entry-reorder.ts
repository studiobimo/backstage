import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { moveItem } from '@/lib/move-item'

import { reorderEntriesMutation } from './queries'
import { useDependentsOutcome } from './use-entry-dependents'

export function useEntryReorder(collection: string) {
  const { t } = useTranslation('collections')
  const queryClient = useQueryClient()
  const outcome = useDependentsOutcome()
  const options = reorderEntriesMutation(queryClient, collection)
  const reorder = useMutation({
    ...options,
    onSuccess: (dependents) => {
      outcome.report(dependents)
    },
    onError: () => toastManager.add({ type: 'error', title: t('reorder.failed') })
  })
  const move = (entries: readonly EntrySummary[], from: number, to: number) =>
    reorder.mutate(
      moveItem(
        entries.map((entry) => entry.id),
        from,
        to
      )
    )
  return { move, outcome }
}
