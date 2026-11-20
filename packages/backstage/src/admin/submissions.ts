import type { AnyD1Database } from 'drizzle-orm/d1'

import { schemaNodeOf } from '../blocks.ts'
import type { AdminRegistry } from '../collections.ts'
import {
  changeSubmissionStatus,
  findSubmission,
  findSubmissionByTokenHash,
  insertSubmission,
  type Submission
} from '../db/submissions.ts'
import { ownerEmailsOf } from '../db/users.ts'
import { readPublishedEntries } from '../db/entry-references.ts'
import { API_ERROR, fieldIssuesOf, type FieldIssue } from '../errors.ts'
import type { SchemaNode } from '../field-shapes.ts'
import { publicFieldsOf } from '../form-projection.ts'
import { daysToMs, formsOf, initialStatusOf, tokenDaysOf, type Form } from '../forms.ts'
import { logLine } from '../log.ts'
import { REFERENCE, referenceFieldsIn, type ReferenceField } from '../references.ts'
import type { RequestContext } from '../rpc.ts'
import { formTitleIn, presentSubmission } from '../submission-presentation.ts'
import type { SubmissionStrings } from '../submission-text.ts'
import { verifyTurnstile } from '../site/turnstile.ts'
import {
  statusResultSchema,
  SUBMISSION,
  submissionTokenSchema,
  type StatusResult,
  type SubmitInput,
  type SubmitResult
} from '../submissions.ts'
import { randomToken, sha256Hex } from './auth-tokens.ts'
import { isTokenActive } from './submission-privacy.ts'
import { publishFormProjection } from './form-projection.ts'
import type { AdminEnv } from './env.ts'
import type { Mailer } from './mailer.ts'
import { submissionMessage } from './submission-email.ts'
import { presentationContextFor } from './submission-context.ts'

export interface SubmissionDeps {
  registry: AdminRegistry
  mailer: Mailer
  now?: () => number
}

type SubmitFailure = Extract<SubmitResult, { ok: false }>

const refuse = (
  error: { code: SubmitFailure['code'] },
  issues: FieldIssue[] = []
): SubmitFailure => ({ ok: false, code: error.code, issues })

const rootIssue = (code: string): FieldIssue => ({ path: [], code })

const byteLengthOf = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length

const referenceProblems = async (
  d1: AnyD1Database,
  registry: AdminRegistry,
  form: Form,
  payload: unknown
): Promise<FieldIssue[]> => {
  const fields = referenceFieldsIn(schemaNodeOf(form.schema) as SchemaNode, form.name, payload)
  if (fields.length === 0) return []
  const published = await readPublishedEntries(d1, registry, fields)
  const known = (field: ReferenceField, id: string) =>
    published.get(field.collection)?.byId.has(id) ?? false
  return fields
    .filter(
      (field) =>
        field.value.mode !== REFERENCE.mode.chosen ||
        !field.value.ids.every((id) => known(field, id))
    )
    .map((field) => ({ path: [field.path], code: SUBMISSION.issue.unknownReference }))
}

const passesTurnstile = async (
  env: AdminEnv,
  form: Form,
  token: string | null,
  context: RequestContext
) => {
  if (!form.turnstile) return true
  const secret = env.TURNSTILE_SECRET
  if (!secret) {
    logLine('error', SUBMISSION.failure.notConfigured, { form: form.name })
    return false
  }
  const result = await verifyTurnstile({ token, secret, ip: context.ip })
  return result.success
}

const subjectOf = (
  form: Form,
  payload: Record<string, unknown>,
  title: string,
  strings: SubmissionStrings
) => {
  const { subject } = form.notify ?? {}
  try {
    return (
      (typeof subject === 'function' ? subject(payload) : subject) || strings.email.subject(title)
    )
  } catch (error) {
    logLine('error', SUBMISSION.failure.subjectFailed, { form: form.name, error: String(error) })
    return strings.email.subject(title)
  }
}

const notificationOf = async (
  env: AdminEnv,
  registry: AdminRegistry,
  form: Form,
  id: string,
  payload: Record<string, unknown>
) => {
  const notify = form.notify ?? {}
  const context = await presentationContextFor(env.DB, registry, form, payload)
  const title = formTitleIn(form, context)
  return submissionMessage({
    form,
    title,
    id,
    fields: presentSubmission(form, payload, context, notify),
    strings: context.strings,
    subject: subjectOf(form, payload, title, context.strings),
    adminOrigin: env.ADMIN_ORIGIN,
    html: notify.html ?? false
  })
}

const notifyOwners = async (
  env: AdminEnv,
  { registry, mailer }: Pick<SubmissionDeps, 'registry' | 'mailer'>,
  form: Form,
  id: string,
  payload: Record<string, unknown>
) => {
  if (!form.notify) return
  const recipients = form.notify.to ?? ownerEmailsOf(env.OWNER_EMAIL)
  const message = await notificationOf(env, registry, form, id, payload)
  const sent = await Promise.allSettled(
    recipients.map((to) => mailer.send({ to, ...message }, env))
  )
  const failed = sent.filter((result) => result.status === 'rejected')
  if (failed.length > 0) {
    logLine('error', SUBMISSION.failure.notifyFailed, { form: form.name, failed: failed.length })
  }
}

const parsePayload = (form: Form, payload: unknown) => {
  const parsed = form.schema.safeParse(payload)
  if (!parsed.success) return { issues: fieldIssuesOf(parsed.error) }
  const data = parsed.data as Record<string, unknown>
  if (byteLengthOf(data) > SUBMISSION.limits.maxPayloadBytes) {
    return { issues: [rootIssue(SUBMISSION.issue.tooLarge)] }
  }
  return { data }
}

export const submitForm = async (
  env: AdminEnv,
  { registry, mailer, now = Date.now }: SubmissionDeps,
  context: RequestContext,
  { form: name, payload, turnstileToken }: SubmitInput
): Promise<SubmitResult> => {
  const form = formsOf(registry).get(name)
  if (!form) return refuse(API_ERROR.notFound)
  const { data, issues } = parsePayload(form, payload)
  if (!data) return refuse(API_ERROR.invalid, issues)
  if (!(await passesTurnstile(env, form, turnstileToken, context))) {
    return refuse(API_ERROR.turnstileFailed)
  }
  const unknownReferences = await referenceProblems(env.DB, registry, form, data)
  if (unknownReferences.length > 0) return refuse(API_ERROR.invalid, unknownReferences)
  const id = crypto.randomUUID()
  const token = randomToken(SUBMISSION.token.bytes)
  const createdAt = now()
  await insertSubmission(env.DB, {
    id,
    form: form.name,
    tokenHash: await sha256Hex(token),
    tokenExpiresAt: createdAt + daysToMs(tokenDaysOf(form)),
    payload: data,
    status: initialStatusOf(form),
    now: createdAt
  })
  await publishFormProjection(env.DB, env.SITE, form, createdAt)
  await notifyOwners(env, { registry, mailer }, form, id, data)
  return { ok: true, id, token }
}

const NOT_FOUND = { ok: false, code: API_ERROR.notFound.code } as const

export const statusOfSubmission = async (
  env: AdminEnv,
  { registry, now = Date.now }: SubmissionDeps,
  token: string
): Promise<StatusResult> => {
  const parsed = submissionTokenSchema.safeParse(token)
  if (!parsed.success) return NOT_FOUND
  const row = await findSubmissionByTokenHash(env.DB, await sha256Hex(parsed.data))
  if (!row || !isTokenActive(row, now())) return NOT_FOUND
  const form = formsOf(registry).get(row.form)
  return statusResultSchema.parse({
    ok: true,
    form: row.form,
    status: row.status,
    fields: form ? publicFieldsOf(form, row.payload) : {}
  })
}

export type StatusChange =
  | { ok: true; submission: Submission }
  | { ok: false; code: typeof API_ERROR.notFound.code | typeof API_ERROR.invalid.code }

export type StatusChangeOptions = { now?: number; editorId?: string | null }

export const setSubmissionStatus = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  registry: AdminRegistry,
  id: string,
  status: string,
  { now = Date.now(), editorId = null }: StatusChangeOptions = {}
): Promise<StatusChange> => {
  const current = await findSubmission(d1, id)
  const form = current ? formsOf(registry).get(current.form) : undefined
  if (!current || !form) return { ok: false, code: API_ERROR.notFound.code }
  if (!form.statuses.includes(status)) return { ok: false, code: API_ERROR.invalid.code }
  const submission = await changeSubmissionStatus(d1, id, status, now, editorId)
  if (!submission) return { ok: false, code: API_ERROR.notFound.code }
  await publishFormProjection(d1, kv, form, now)
  return { ok: true, submission }
}
