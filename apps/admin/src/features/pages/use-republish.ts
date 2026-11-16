import {
  KV_LIMITS,
  type RepublishEntry,
  type RepublishScope,
  type RepublishBatch,
  type RepublishSkipped
} from '@studiobimo/backstage/internal'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { entryRun, NEW_RUN, readStoredRun, storeRun } from './republish-run'
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
  remaining: number
  error: unknown
}

const IDLE: RepublishProgress = {
  phase: REPUBLISH_PHASE.idle,
  total: 0,
  processed: 0,
  skipped: [],
  writes: 0,
  remaining: 0,
  error: null
}

const pause = () => new Promise((resolve) => setTimeout(resolve, KV_LIMITS.writesPerKeyIntervalMs))

const phaseAfter = (done: boolean, ended: boolean) => {
  if (done) return REPUBLISH_PHASE.done
  return ended ? REPUBLISH_PHASE.stopped : REPUBLISH_PHASE.running
}

const nextScope = (entry: RepublishEntry | undefined, batch: RepublishBatch): RepublishScope =>
  entry
    ? { since: null, cursor: batch.cursor, entry }
    : { since: batch.since, cursor: batch.cursor }

export function useRepublish(entry?: RepublishEntry) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<RepublishScope>(() =>
    entry ? entryRun(entry) : readStoredRun()
  )
  const [progress, setProgress] = useState<RepublishProgress>(IDLE)
  const stopRequested = useRef(false)

  const remember = (next: RepublishScope) => {
    if (!entry) storeRun(next)
    setScope(next)
  }

  const run = async (total: number, from: RepublishScope = scope) => {
    stopRequested.current = false
    let current = from
    let totals: RepublishProgress = {
      ...IDLE,
      total,
      remaining: total,
      phase: REPUBLISH_PHASE.running
    }
    setProgress(totals)
    try {
      while (totals.phase === REPUBLISH_PHASE.running) {
        const batch = await republishNextBatch(current)
        current = nextScope(entry, batch)
        remember(batch.done ? (entry ? entryRun(entry) : NEW_RUN) : current)
        const ended = batch.done || batch.halted || stopRequested.current
        totals = {
          ...totals,
          phase: phaseAfter(batch.done, ended),
          processed: totals.processed + batch.republished.length + batch.skipped.length,
          skipped: [...totals.skipped, ...batch.skipped],
          writes: totals.writes + batch.writes,
          remaining: batch.remaining
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
    reset: () => {
      setProgress(IDLE)
      if (entry) setScope(entryRun(entry))
    }
  }
}
