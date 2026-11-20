import { and, count, desc, eq, gte, lt, lte, sql, type SQL } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { submissions } from './schema.ts'

export interface NewSubmission {
  id: string
  form: string
  tokenHash: string
  tokenExpiresAt: number
  payload: Record<string, unknown>
  status: string
  now: number
}

export type Submission = typeof submissions.$inferSelect

export const insertSubmission = (d1: AnyD1Database, { now, ...submission }: NewSubmission) =>
  drizzle(d1)
    .insert(submissions)
    .values({ ...submission, createdAt: now, updatedAt: now })

export const findSubmissionByTokenHash = async (d1: AnyD1Database, tokenHash: string) => {
  const [row] = await drizzle(d1)
    .select()
    .from(submissions)
    .where(eq(submissions.tokenHash, tokenHash))
  return row ?? null
}

export const findSubmission = async (d1: AnyD1Database, id: string) => {
  const [row] = await drizzle(d1).select().from(submissions).where(eq(submissions.id, id))
  return row ?? null
}

export interface DateRange {
  field: string
  from?: string
  to?: string
}

const dateOf = (field: string) => sql<string>`json_extract(${submissions.payload}, ${`$.${field}`})`

const dateConditions = ({ field, from, to }: DateRange): SQL[] => [
  ...(from === undefined ? [] : [gte(dateOf(field), from)]),
  ...(to === undefined ? [] : [lte(dateOf(field), to)])
]

export const listSubmissions = (
  d1: AnyD1Database,
  form: string,
  status?: string,
  range?: DateRange,
  limit?: number
) => {
  const query = drizzle(d1)
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.form, form),
        status === undefined ? undefined : eq(submissions.status, status),
        ...(range ? dateConditions(range) : [])
      )
    )
    .orderBy(desc(submissions.createdAt), desc(submissions.id))
  return limit === undefined ? query : query.limit(limit)
}

export const countSubmissionsByStatus = (d1: AnyD1Database) =>
  drizzle(d1)
    .select({ form: submissions.form, status: submissions.status, total: count() })
    .from(submissions)
    .groupBy(submissions.form, submissions.status)

export const changeSubmissionStatus = async (
  d1: AnyD1Database,
  id: string,
  status: string,
  now: number,
  editorId: string | null = null
) => {
  const [row] = await drizzle(d1)
    .update(submissions)
    .set({ status, updatedAt: now, updatedBy: editorId })
    .where(eq(submissions.id, id))
    .returning()
  return row ?? null
}

export const revokeSubmissionToken = async (d1: AnyD1Database, id: string) => {
  const [row] = await drizzle(d1)
    .update(submissions)
    .set({ tokenExpiresAt: null })
    .where(eq(submissions.id, id))
    .returning()
  return row ?? null
}

export const anonymiseStoredSubmission = async (
  d1: AnyD1Database,
  id: string,
  now: number,
  editorId: string | null
) => {
  const [row] = await drizzle(d1)
    .update(submissions)
    .set({ payload: {}, tokenExpiresAt: null, updatedAt: now, updatedBy: editorId })
    .where(eq(submissions.id, id))
    .returning()
  return row ?? null
}

export const deleteStoredSubmission = async (d1: AnyD1Database, id: string) => {
  const removed = await drizzle(d1)
    .delete(submissions)
    .where(eq(submissions.id, id))
    .returning({ id: submissions.id })
  return removed.length > 0
}

export const deleteSubmissionsCreatedBefore = async (
  d1: AnyD1Database,
  form: string,
  cutoff: number
) =>
  (
    await drizzle(d1)
      .delete(submissions)
      .where(and(eq(submissions.form, form), lt(submissions.createdAt, cutoff)))
      .returning({ id: submissions.id })
  ).length
