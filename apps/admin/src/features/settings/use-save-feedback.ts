import { API_ERROR, type FieldIssue, type PageStamp } from '@studiobimo/backstage'
import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { fieldIssuesFrom } from '@/lib/api-feedback'

export interface StaleSave {
  current?: PageStamp
}

const staleOf = (error: unknown): StaleSave | undefined =>
  error instanceof ApiError && error.code === API_ERROR.staleVersion.code
    ? { current: error.current }
    : undefined

export function useSaveFeedback<V>(save: (value: V) => Promise<unknown>) {
  const { t } = useTranslation('settings')
  const [failed, setFailed] = useState(false)
  const [stale, setStale] = useState<StaleSave>()
  const [issues, setIssues] = useState<FieldIssue[]>([])
  async function submit(value: V) {
    setFailed(false)
    setStale(undefined)
    setIssues([])
    try {
      await save(value)
      toastManager.add({
        type: 'success',
        title: t('saved.title'),
        description: t('saved.description')
      })
    } catch (error) {
      const refused = fieldIssuesFrom(error)
      const newer = staleOf(error)
      setIssues(refused)
      setStale(newer)
      setFailed(refused.length === 0 && !newer)
    }
  }
  return { submit, failed, stale, issues, clearStale: () => setStale(undefined) }
}

export function useReloadLatest(queryKey: QueryKey, clearStale: () => void) {
  const queryClient = useQueryClient()
  const [generation, setGeneration] = useState(0)
  async function reload() {
    await queryClient.refetchQueries({ queryKey })
    clearStale()
    setGeneration((current) => current + 1)
  }
  return { generation, reload }
}
