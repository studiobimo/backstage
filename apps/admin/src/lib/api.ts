import { API_ERROR } from '@studiobimo/backstage'
import {
  fieldIssueSchema,
  mediaInUseResponseSchema,
  pageStampSchema,
  publishProblemsResponseSchema,
  type FieldIssue,
  type MediaUsage,
  type PageStamp,
  type PublishProblem
} from '@studiobimo/backstage/internal'
import { z } from 'zod'

export const API_ROOT = { v1: '/api/v1', auth: '/api/auth' } as const

export const SESSION_EXPIRED = { code: 'session_expired', message: 'The session ended' } as const

interface ApiErrorDetails {
  current?: PageStamp
  problems?: PublishProblem[]
  issues?: FieldIssue[]
  usedBy?: MediaUsage[]
}

export class ApiError extends Error {
  readonly code: string
  readonly current?: PageStamp
  readonly problems: PublishProblem[]
  readonly issues: FieldIssue[]
  readonly usedBy: MediaUsage[]
  constructor(code: string, message: string, details: ApiErrorDetails = {}) {
    super(message)
    this.code = code
    this.current = details.current
    this.problems = details.problems ?? []
    this.issues = details.issues ?? []
    this.usedBy = details.usedBy ?? []
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
  issues: z.array(fieldIssueSchema).nullish(),
  usedBy: mediaInUseResponseSchema.shape.usedBy.nullish()
})

const requestHeaders = (init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return headers
}

export const failureFrom = async (response: Response) => {
  const failure = failureShape.safeParse(await response.json().catch(() => null))
  if (!failure.success) return new ApiError(API_ERROR.internal.code, API_ERROR.internal.message)
  const { code, error, current, problems, issues, usedBy } = failure.data
  return new ApiError(code, error, {
    current: current ?? undefined,
    problems: problems ?? undefined,
    issues: issues ?? undefined,
    usedBy: usedBy ?? undefined
  })
}

export const apiRequest = async (path: string, init?: RequestInit, root: string = API_ROOT.v1) => {
  const response = await fetch(`${root}${path}`, {
    ...init,
    redirect: 'manual',
    headers: requestHeaders(init)
  })
  if (response.type === 'opaqueredirect') throw new SessionExpiredError()
  if (response.ok) return response
  throw await failureFrom(response)
}
