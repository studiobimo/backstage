import {
  API_ERROR,
  pageStampSchema,
  publishProblemsResponseSchema,
  type PageStamp,
  type PublishProblem
} from '@studiobimo/backstage'
import { z } from 'zod'

const API_ROOT = '/api/v1'

export class ApiError extends Error {
  readonly code: string
  readonly current?: PageStamp
  readonly problems: PublishProblem[]
  constructor(code: string, message: string, current?: PageStamp, problems: PublishProblem[] = []) {
    super(message)
    this.code = code
    this.current = current
    this.problems = problems
  }
}

const failureShape = z.object({
  error: z.string(),
  code: z.string(),
  current: pageStampSchema.nullish(),
  problems: publishProblemsResponseSchema.shape.problems.nullish()
})

export const apiRequest = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? undefined : { 'content-type': 'application/json' }
  })
  if (response.ok) return response
  const failure = failureShape.safeParse(await response.json().catch(() => null))
  const { code, error, current, problems } = failure.success
    ? failure.data
    : {
        code: API_ERROR.internal.code,
        error: API_ERROR.internal.message,
        current: null,
        problems: null
      }
  throw new ApiError(code, error, current ?? undefined, problems ?? undefined)
}
