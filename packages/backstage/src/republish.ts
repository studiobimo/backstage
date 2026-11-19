import { z } from 'zod'

import type { Locale } from './locales.ts'
import { publishProblemsResponseSchema, SNAPSHOT_RECORDS_PER_LOCALE } from './publishing.ts'

export const KV_LIMITS = {
  writesPerKeyIntervalMs: 1000,
  freePlanWritesPerDay: 1000,
  subrequestsPerInvocation: 50
} as const

const SUBREQUESTS = { perPagePerLocale: 7.5, perBatchOverhead: 8 } as const

export const REPUBLISH = { writes: { perIndexRebuild: 1, perVersionBump: 1 } } as const

export const republishBatchSize = (locales: readonly Locale[]) =>
  Math.max(
    1,
    Math.floor(
      (KV_LIMITS.subrequestsPerInvocation - SUBREQUESTS.perBatchOverhead) /
        Math.ceil(SUBREQUESTS.perPagePerLocale * locales.length)
    )
  )

export const kvWritesPerPage = (locales: readonly Locale[]) =>
  locales.length * SNAPSHOT_RECORDS_PER_LOCALE

export const kvWritesToRepublish = (pageCount: number, locales: readonly Locale[]) =>
  pageCount === 0
    ? 0
    : pageCount * kvWritesPerPage(locales) +
      REPUBLISH.writes.perIndexRebuild +
      REPUBLISH.writes.perVersionBump

export const kvWritesToRefresh = (pageCount: number, locales: readonly Locale[]) =>
  pageCount === 0 ? 0 : pageCount * locales.length + REPUBLISH.writes.perVersionBump

const republishEntrySchema = z.object({
  collection: z.string().min(1),
  entryId: z.string().min(1).optional()
})
export type RepublishEntry = z.infer<typeof republishEntrySchema>

export const republishScopeSchema = z.object({
  since: z.number().int().min(0).nullable(),
  cursor: z.string().nullable(),
  entry: republishEntrySchema.optional(),
  linkedTo: z.string().min(1).optional()
})
export type RepublishScope = z.infer<typeof republishScopeSchema>

const republishStatusSchema = z.object({
  remaining: z.number().int(),
  changed: z.number().int(),
  writes: z.number().int(),
  dailyWriteLimit: z.number().int()
})
export type RepublishStatus = z.infer<typeof republishStatusSchema>

export const republishStatusResponseSchema = z.object({ status: republishStatusSchema })

const republishSkippedSchema = z.object({
  pageId: z.string(),
  problems: publishProblemsResponseSchema.shape.problems
})
export type RepublishSkipped = z.infer<typeof republishSkippedSchema>

export const republishBatchSchema = z.object({
  since: z.number().int(),
  cursor: z.string().nullable(),
  republished: z.array(z.string()),
  skipped: z.array(republishSkippedSchema),
  remaining: z.number().int(),
  writes: z.number().int(),
  done: z.boolean(),
  halted: z.boolean()
})
export type RepublishBatch = z.infer<typeof republishBatchSchema>

const entryDependentsSchema = z.object({
  pages: z.number().int(),
  writes: z.number().int(),
  pending: z.boolean(),
  batch: republishBatchSchema.nullable()
})
export type EntryDependents = z.infer<typeof entryDependentsSchema>

export const entryDependentsResponseSchema = z.object({ republish: entryDependentsSchema })
