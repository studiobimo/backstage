import { errorBody, type ApiError } from '@studiobimo/backstage'
import type { Context } from 'hono'

export const respondWithError = (c: Context, error: ApiError) =>
  c.json(errorBody(error), error.status)
