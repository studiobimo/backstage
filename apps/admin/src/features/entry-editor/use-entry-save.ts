import { API_ERROR } from '@studiobimo/backstage'
import type { Entry } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api'
import { fieldIssuesFrom, useApiErrorMessage } from '@/lib/api-feedback'

import { createEntryMutation, saveEntryMutation } from '../collections/queries'
import type { BlockValue } from '../block-form/value'

interface SaveTarget {
  collection: string
  entry?: Pick<Entry, 'id' | 'version'>
  content: BlockValue
  onCreated: (entry: Entry) => void
}

export function useEntrySave({ collection, entry, content: draft, onCreated }: SaveTarget) {
  const content = draft as Entry['content']
  const queryClient = useQueryClient()
  const messageOf = useApiErrorMessage()
  const create = useMutation(createEntryMutation(queryClient, collection))
  const update = useMutation(saveEntryMutation(queryClient, collection, entry?.id ?? ''))
  const error = create.error ?? update.error
  const stale =
    error instanceof ApiError && error.code === API_ERROR.staleVersion.code ? error : undefined
  const issues = fieldIssuesFrom(error)
  const failure = error && !stale && issues.length === 0 ? messageOf(error) : undefined
  const save = async () => {
    create.reset()
    update.reset()
    try {
      if (entry) await update.mutateAsync({ content, expectedVersion: entry.version })
      else onCreated(await create.mutateAsync(content))
      return []
    } catch (failure) {
      return fieldIssuesFrom(failure)
    }
  }
  return {
    save,
    saving: create.isPending || update.isPending,
    failure,
    issues,
    stale: stale && { current: stale.current }
  }
}
