import { errorBody, type ApiError } from '../index.ts'
import type { Context } from 'hono'

export const respondWithError = (c: Context, error: ApiError) =>
  c.json(errorBody(error), error.status)

export const RESPONSE_STATUS = { created: 201, noContent: 204 } as const
