import { z } from 'zod'

import { API_ERROR, fieldIssueSchema } from './errors.ts'

const TOKEN_BYTES = 24
const HEX_CHARS_PER_BYTE = 2

export const SUBMISSION = {
  token: { bytes: TOKEN_BYTES, length: TOKEN_BYTES * HEX_CHARS_PER_BYTE },
  limits: {
    maxPayloadBytes: 16 * 1024,
    maxFormNameLength: 64,
    maxTurnstileTokenLength: 2048,
    maxTokenLength: 256
  },
  issue: { tooLarge: 'too_big', unknownReference: 'unknown_reference' },
  failure: {
    notConfigured: 'Turnstile is on for this form but TURNSTILE_SECRET is not set',
    notifyFailed: 'The submission notification could not be sent',
    subjectFailed: 'The notification subject function threw, so the default subject was used'
  }
} as const

export const submissionTokenSchema = z
  .string()
  .regex(new RegExp(`^[0-9a-f]{${SUBMISSION.token.length}}$`))

const submissionStatusSchema = z.string().min(1)

const submitFailureCodes = [
  API_ERROR.notFound.code,
  API_ERROR.invalid.code,
  API_ERROR.turnstileFailed.code
] as const

export const submitInputSchema = z.object({
  form: z.string().min(1).max(SUBMISSION.limits.maxFormNameLength),
  payload: z.unknown(),
  turnstileToken: z.string().max(SUBMISSION.limits.maxTurnstileTokenLength).nullable()
})

export type SubmitInput = z.infer<typeof submitInputSchema>

export const statusInputSchema = z.string().max(SUBMISSION.limits.maxTokenLength)

export const submitResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), id: z.string(), token: submissionTokenSchema }),
  z.object({
    ok: z.literal(false),
    code: z.enum(submitFailureCodes),
    issues: z.array(fieldIssueSchema)
  })
])
export type SubmitResult = z.infer<typeof submitResultSchema>

export const statusResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    form: z.string(),
    status: submissionStatusSchema,
    fields: z.record(z.string(), z.unknown())
  }),
  z.object({ ok: z.literal(false), code: z.literal(API_ERROR.notFound.code) })
])
export type StatusResult = z.infer<typeof statusResultSchema>
