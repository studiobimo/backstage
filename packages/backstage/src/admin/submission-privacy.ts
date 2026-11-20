import type { AnyD1Database } from 'drizzle-orm/d1'

import type { AdminRegistry } from '../collections.ts'
import {
  anonymiseStoredSubmission,
  deleteStoredSubmission,
  deleteSubmissionsCreatedBefore,
  findSubmission,
  revokeSubmissionToken,
  type Submission
} from '../db/submissions.ts'
import { API_ERROR } from '../errors.ts'
import { daysToMs, formsOf, type Form } from '../forms.ts'
import { publishFormProjection } from './form-projection.ts'

export type PrivacyChange =
  { ok: true; submission: Submission } | { ok: false; code: typeof API_ERROR.notFound.code }

export type PrivacyOptions = { now?: number; editorId?: string | null }

const NOT_FOUND = { ok: false, code: API_ERROR.notFound.code } as const

export const isTokenActive = ({ tokenExpiresAt }: Submission, now: number) =>
  tokenExpiresAt !== null && tokenExpiresAt > now

const formOfSubmission = async (d1: AnyD1Database, registry: AdminRegistry, id: string) => {
  const submission = await findSubmission(d1, id)
  const form = submission ? formsOf(registry).get(submission.form) : undefined
  return submission && form ? { submission, form } : null
}

export const revokeToken = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  id: string
): Promise<PrivacyChange> => {
  if (!(await formOfSubmission(d1, registry, id))) return NOT_FOUND
  const submission = await revokeSubmissionToken(d1, id)
  return submission ? { ok: true, submission } : NOT_FOUND
}

export const anonymiseSubmission = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  registry: AdminRegistry,
  id: string,
  { now = Date.now(), editorId = null }: PrivacyOptions = {}
): Promise<PrivacyChange> => {
  const found = await formOfSubmission(d1, registry, id)
  if (!found) return NOT_FOUND
  const submission = await anonymiseStoredSubmission(d1, id, now, editorId)
  if (!submission) return NOT_FOUND
  await publishFormProjection(d1, kv, found.form, now)
  return { ok: true, submission }
}

export const deleteSubmission = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  registry: AdminRegistry,
  id: string,
  now = Date.now()
) => {
  const found = await formOfSubmission(d1, registry, id)
  if (!found || !(await deleteStoredSubmission(d1, id))) return false
  await publishFormProjection(d1, kv, found.form, now)
  return true
}

export const purgeExpiredSubmissions = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  form: Form,
  now = Date.now()
) => {
  if (!form.retention) return 0
  const removed = await deleteSubmissionsCreatedBefore(
    d1,
    form.name,
    now - daysToMs(form.retention.days)
  )
  if (removed > 0) await publishFormProjection(d1, kv, form, now)
  return removed
}
