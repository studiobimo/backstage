import {
  KV_LIMITS,
  type RepublishScope,
  type RepublishSkipped
} from '@studiobimo/backstage/internal'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { NEW_RUN, readStoredRun, storeRun } from './republish-run'
import { republishNextBatch } from './republish-queries'

export const REPUBLISH_PHASE = {
  idle: 'idle',
  running: 'running',
  stopped: 'stopped',
  failed: 'failed',
  done: 'done'
} as const

type Phase = (typeof REPUBLISH_PHASE)[keyof typeof REPUBLISH_PHASE]

export interface RepublishProgress {
  phase: Phase
  total: number
  processed: number
  skipped: RepublishSkipped[]
  writes: number
  error: unknown
}

const IDLE: RepublishProgress = {
  phase: REPUBLISH_PHASE.idle,
  total: 0,
  processed: 0,
  skipped: [],
  writes: 0,
  error: null
}

const pause = () => new Promise((resolve) => setTimeout(resolve, KV_LIMITS.writesPerKeyIntervalMs))

const phaseAfter = (done: boolean, ended: boolean) => {
  if (done) return REPUBLISH_PHASE.done
  return ended ? REPUBLISH_PHASE.stopped : REPUBLISH_PHASE.running
}

export function useRepublish() {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<RepublishScope>(readStoredRun)
  const [progress, setProgress] = useState<RepublishProgress>(IDLE)
  const stopRequested = useRef(false)

  const remember = (next: RepublishScope) => {
    storeRun(next)
    setScope(next)
  }

  const run = async (total: number) => {
    stopRequested.current = false
    let current = scope
    let totals: RepublishProgress = { ...IDLE, total, phase: REPUBLISH_PHASE.running }
    setProgress(totals)
    try {
      while (totals.phase === REPUBLISH_PHASE.running) {
        const batch = await republishNextBatch(current)
        current = { since: batch.since, cursor: batch.cursor }
        remember(batch.done ? NEW_RUN : current)
        const ended = batch.done || batch.halted || stopRequested.current
        totals = {
          ...totals,
          phase: phaseAfter(batch.done, ended),
          processed: totals.processed + batch.republished.length + batch.skipped.length,
          skipped: [...totals.skipped, ...batch.skipped],
          writes: totals.writes + batch.writes
        }
        setProgress(totals)
        if (!ended) await pause()
      }
    } catch (error) {
      setProgress({ ...totals, phase: REPUBLISH_PHASE.failed, error })
    }
    await queryClient.invalidateQueries({ queryKey: ['pages'] })
  }

  return {
    scope,
    progress,
    run,
    stop: () => {
      stopRequested.current = true
    },
    reset: () => setProgress(IDLE)
  }
}
