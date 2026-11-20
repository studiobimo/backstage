import type { Context } from 'hono'
import type { z } from 'zod'

import {
  API_ERROR,
  errorBody,
  fieldIssuesOf,
  invalidBody,
  type ApiError,
  type FieldIssue
} from '../errors.ts'
import { ensureUser } from '../db/users.ts'
import type { PageStamp } from '../pages.ts'
import type { PublishProblem } from '../publishing.ts'
import type { VersionedWrite } from '../db/versioned-row.ts'

import type { AccessEnv } from './auth.ts'

export const respondWithError = (c: Context, error: ApiError) =>
  c.json(errorBody(error), error.status)

export const respondInvalid = (c: Context, issues: readonly FieldIssue[]) =>
  c.json(invalidBody(issues), API_ERROR.invalid.status)

export const respondKeyProblem = (c: Context, field: string, error: ApiError) =>
  c.json({ ...errorBody(error), issues: [{ path: [field], code: error.code }] }, error.status)

export const respondWithStale = (c: Context, current: PageStamp | null) =>
  c.json({ ...errorBody(API_ERROR.staleVersion), current }, API_ERROR.staleVersion.status)

export const versionedWrite = async (
  c: Context<AccessEnv>,
  expectedVersion: number
): Promise<VersionedWrite> => ({
  expectedVersion,
  editorId: await ensureUser(c.env.DB, c.get('editor'))
})

export const respondUnpublishable = (c: Context, problems: readonly PublishProblem[]) =>
  c.json({ ...errorBody(API_ERROR.unpublishable), problems }, API_ERROR.unpublishable.status)

export const RESPONSE_STATUS = { created: 201, accepted: 202, noContent: 204 } as const

const JSON_BODY = { mediaType: 'application/json', parameterSeparator: ';' } as const

const isJsonRequest = (c: Context) =>
  c.req.header('content-type')?.split(JSON_BODY.parameterSeparator)[0]?.trim().toLowerCase() ===
  JSON_BODY.mediaType

export type JsonBody<T> = { ok: true; data: T } | { ok: false; response: Response }

export const readJsonBody = async <S extends z.ZodType>(
  c: Context,
  schema: S
): Promise<JsonBody<z.infer<S>>> => {
  if (!isJsonRequest(c)) {
    return { ok: false, response: respondWithError(c, API_ERROR.unsupportedContentType) }
  }
  const parsed = schema.safeParse(await c.req.json().catch(() => null))
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, response: respondInvalid(c, fieldIssuesOf(parsed.error)) }
}
