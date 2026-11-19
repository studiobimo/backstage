import { and, desc, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { submissions } from './schema.ts'

export interface NewSubmission {
  id: string
  form: string
  tokenHash: string
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

export const listSubmissions = (d1: AnyD1Database, form: string, status?: string) =>
  drizzle(d1)
    .select()
    .from(submissions)
    .where(
      status === undefined
        ? eq(submissions.form, form)
        : and(eq(submissions.form, form), eq(submissions.status, status))
    )
    .orderBy(desc(submissions.createdAt), desc(submissions.id))

export const changeSubmissionStatus = async (
  d1: AnyD1Database,
  id: string,
  status: string,
  now: number
) => {
  const [row] = await drizzle(d1)
    .update(submissions)
    .set({ status, updatedAt: now })
    .where(eq(submissions.id, id))
    .returning()
  return row ?? null
}
