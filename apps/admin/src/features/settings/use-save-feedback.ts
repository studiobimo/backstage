import { API_ERROR } from '@studiobimo/backstage'
import type { FieldIssue, PageStamp } from '@studiobimo/backstage/internal'
import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError } from '@/lib/api'
import { fieldIssuesFrom } from '@/lib/api-feedback'

import { invalidateSitePublication } from './queries'
import { SAVE_OUTCOME, type SaveOutcome } from './settings-host'

export interface StaleSave {
  current?: PageStamp
}

export const SKIPPED = Symbol('skipped')

const staleOf = (error: unknown): StaleSave | undefined =>
  error instanceof ApiError && error.code === API_ERROR.staleVersion.code
    ? { current: error.current }
    : undefined

export function useSaveFeedback<V>(save: (value: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  const [failed, setFailed] = useState(false)
  const [stale, setStale] = useState<StaleSave>()
  const [issues, setIssues] = useState<FieldIssue[]>([])
  async function submit(value: V): Promise<SaveOutcome> {
    setFailed(false)
    setStale(undefined)
    setIssues([])
    try {
      if ((await save(value)) === SKIPPED) return SAVE_OUTCOME.skipped
      void invalidateSitePublication(queryClient)
      return SAVE_OUTCOME.saved
    } catch (error) {
      const refused = fieldIssuesFrom(error)
      const newer = staleOf(error)
      setIssues(refused)
      setStale(newer)
      setFailed(refused.length === 0 && !newer)
      return SAVE_OUTCOME.failed
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
