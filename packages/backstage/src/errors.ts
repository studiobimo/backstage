import { z } from 'zod'

export const API_ERROR = {
  forbidden: { code: 'forbidden', status: 403, message: 'Forbidden' },
  unauthorized: { code: 'unauthorized', status: 401, message: 'Sign in to continue' },
  invalidLoginLink: {
    code: 'invalid_login_link',
    status: 400,
    message: 'This sign-in link is invalid or has expired'
  },
  tooManyRequests: {
    code: 'too_many_requests',
    status: 429,
    message: 'Too many attempts. Try again later'
  },
  invalid: { code: 'invalid', status: 400, message: 'Invalid input' },
  slugTaken: { code: 'slug_taken', status: 409, message: 'That slug is already used' },
  homeTaken: { code: 'home_taken', status: 409, message: 'The home page already exists' },
  staleVersion: {
    code: 'stale_version',
    status: 409,
    message: 'A newer version of this page was saved'
  },
  unpublishable: {
    code: 'unpublishable',
    status: 422,
    message: 'This page has content that cannot be published'
  },
  tooLarge: { code: 'too_large', status: 413, message: 'The image is too large' },
  unsupportedMedia: {
    code: 'unsupported_media',
    status: 415,
    message: 'Only JPEG, PNG, WebP and AVIF images are accepted'
  },
  unsupportedContentType: {
    code: 'unsupported_content_type',
    status: 415,
    message: 'Send the request body as application/json'
  },
  notFound: { code: 'not_found', status: 404, message: 'Not found' },
  internal: { code: 'internal', status: 500, message: 'Internal error' },
  devAuthOutsideLocal: {
    code: 'dev_auth_outside_local',
    status: 500,
    message: 'DEV_AUTH is set on a deployed worker'
  }
} as const

export type ApiError = (typeof API_ERROR)[keyof typeof API_ERROR]

export const errorBody = ({ code, message }: ApiError) => ({ error: message, code })

const issuePathSegment = z.union([z.string(), z.number()])

export const fieldIssueSchema = z.object({
  path: z.array(issuePathSegment),
  code: z.string(),
  origin: z.string().optional(),
  format: z.string().optional(),
  expected: z.string().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional()
})
export type FieldIssue = z.infer<typeof fieldIssueSchema>

export const invalidResponseSchema = z.object({
  error: z.string(),
  code: z.literal(API_ERROR.invalid.code),
  issues: z.array(fieldIssueSchema)
})

const toNumber = (bound: unknown) =>
  typeof bound === 'number' || typeof bound === 'bigint' ? Number(bound) : undefined

const stringOrUndefined = (value: unknown) => (typeof value === 'string' ? value : undefined)

const pathSegmentsOf = (path: readonly PropertyKey[]) =>
  path.map((segment) => (typeof segment === 'number' ? segment : String(segment)))

export const fieldIssuesOf = (error: z.ZodError): FieldIssue[] =>
  error.issues.map((issue) => {
    const params: Record<string, unknown> = { ...issue }
    return fieldIssueSchema.parse({
      path: pathSegmentsOf(issue.path),
      code: issue.code,
      origin: stringOrUndefined(params.origin),
      format: stringOrUndefined(params.format),
      expected: stringOrUndefined(params.expected),
      minimum: toNumber(params.minimum),
      maximum: toNumber(params.maximum)
    })
  })

export const invalidBody = (issues: readonly FieldIssue[]) => ({
  ...errorBody(API_ERROR.invalid),
  issues
})
