import { API_ERROR } from '@studiobimo/backstage'
import {
  fieldIssueSchema,
  pageStampSchema,
  publishProblemsResponseSchema,
  type FieldIssue,
  type PageStamp,
  type PublishProblem
} from '@studiobimo/backstage/internal'
import { z } from 'zod'

export const API_ROOT = { v1: '/api/v1', auth: '/api/auth' } as const

export const SESSION_EXPIRED = { code: 'session_expired', message: 'The session ended' } as const

export class ApiError extends Error {
  readonly code: string
  readonly current?: PageStamp
  readonly problems: PublishProblem[]
  readonly issues: FieldIssue[]
  constructor(
    code: string,
    message: string,
    current?: PageStamp,
    problems: PublishProblem[] = [],
    issues: FieldIssue[] = []
  ) {
    super(message)
    this.code = code
    this.current = current
    this.problems = problems
    this.issues = issues
  }
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super(SESSION_EXPIRED.code, SESSION_EXPIRED.message)
  }
}

const failureShape = z.object({
  error: z.string(),
  code: z.string(),
  current: pageStampSchema.nullish(),
  problems: publishProblemsResponseSchema.shape.problems.nullish(),
  issues: z.array(fieldIssueSchema).nullish()
})

const requestHeaders = (init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return headers
}

export const apiRequest = async (path: string, init?: RequestInit, root: string = API_ROOT.v1) => {
  const response = await fetch(`${root}${path}`, {
    ...init,
    redirect: 'manual',
    headers: requestHeaders(init)
  })
  if (response.type === 'opaqueredirect') throw new SessionExpiredError()
  if (response.ok) return response
  const failure = failureShape.safeParse(await response.json().catch(() => null))
  const { code, error, current, problems, issues } = failure.success
    ? failure.data
    : {
        code: API_ERROR.internal.code,
        error: API_ERROR.internal.message,
        current: null,
        problems: null,
        issues: null
      }
  throw new ApiError(code, error, current ?? undefined, problems ?? undefined, issues ?? undefined)
}
