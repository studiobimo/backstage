import type { Context } from 'hono'
import type { z } from 'zod'

import { API_ERROR, errorBody, type ApiError } from '../index.ts'

export const respondWithError = (c: Context, error: ApiError) =>
  c.json(errorBody(error), error.status)

export const RESPONSE_STATUS = { created: 201, noContent: 204 } as const

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
    : { ok: false, response: respondWithError(c, API_ERROR.invalid) }
}
