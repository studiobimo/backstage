import { z } from 'zod'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const INBOX = {
  maxSubmissions: 500,
  dateFormat: 'date',
  paths: { anonymise: 'anonymise', revokeToken: 'revoke-token' },
  query: { status: 'status', from: 'from', to: 'to' }
} as const

const dateSchema = z.string().regex(DATE_PATTERN)

export const inboxFilterSchema = z.object({
  [INBOX.query.status]: z.string().min(1).optional(),
  [INBOX.query.from]: dateSchema.optional(),
  [INBOX.query.to]: dateSchema.optional()
})

export const formDescriptionSchema = z.object({
  name: z.string(),
  title: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional(),
  statuses: z.array(z.string()),
  newStatus: z.string(),
  newCount: z.number().int(),
  dateField: z.string().nullable(),
  schema: z.record(z.string(), z.unknown())
})
export type FormDescription = z.infer<typeof formDescriptionSchema>

export const formsResponseSchema = z.object({ forms: z.array(formDescriptionSchema) })

export const submissionSchema = z.object({
  id: z.string(),
  form: z.string(),
  status: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  updatedBy: z.string().nullable(),
  tokenActive: z.boolean()
})
export type InboxSubmission = z.infer<typeof submissionSchema>

export const submissionsResponseSchema = z.object({ submissions: z.array(submissionSchema) })

const referencedEntriesSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), z.string()))
)
export type ReferencedEntries = z.infer<typeof referencedEntriesSchema>

export const submissionResponseSchema = z.object({
  submission: submissionSchema,
  entries: referencedEntriesSchema
})

export const submissionStatusChangeSchema = z.object({ status: z.string().min(1) })
