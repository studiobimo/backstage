import type { Context } from 'hono'

import type { ApiError } from '../../errors.ts'

export const respondWithError = (c: Context, error: ApiError, headers?: Record<string, string>) =>
  c.text(error.message, error.status, headers)
