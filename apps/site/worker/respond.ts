import type { ApiError } from '@studiobimo/backstage'
import type { Context } from 'hono'

export const respondWithError = (c: Context, error: ApiError, headers?: Record<string, string>) =>
  c.text(error.message, error.status, headers)
