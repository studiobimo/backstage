import { z } from 'zod'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const INBOX = {
  maxSubmissions: 500,
  dateFormat: 'date',
  columns: { defaultCount: 4, maxCount: 6, keySeparator: '+', cellSeparator: ' ' },
  languageParam: 'language',
  maxLanguageLength: 35,
  paths: { anonymise: 'anonymise', revokeToken: 'revoke-token' },
  query: { status: 'status', from: 'from', to: 'to' },
  submissionPath: (form: string, id: string) => `/forms/${form}/${id}`
} as const

const dateSchema = z.string().regex(DATE_PATTERN)

export const inboxFilterSchema = z.object({
  [INBOX.query.status]: z.string().min(1).optional(),
  [INBOX.query.from]: dateSchema.optional(),
  [INBOX.query.to]: dateSchema.optional()
})

export interface PresentedColumn {
  key: string
  label: string
}

export interface PresentedTotal {
  label: string
  text: string
}

export type PresentedValue =
  | { kind: 'text'; text: string }
  | { kind: 'fields'; fields: PresentedField[] }
  | { kind: 'table'; columns: PresentedColumn[]; rows: string[][]; total?: PresentedTotal }

export interface PresentedField {
  key: string
  label: string
  value: PresentedValue
}

const presentedColumnSchema = z.object({ key: z.string(), label: z.string() })

const presentedValueSchema: z.ZodType<PresentedValue> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: z.string() }),
    z.object({ kind: z.literal('fields'), fields: z.array(presentedFieldSchema) }),
    z.object({
      kind: z.literal('table'),
      columns: z.array(presentedColumnSchema),
      rows: z.array(z.array(z.string())),
      total: z.object({ label: z.string(), text: z.string() }).optional()
    })
  ])
)

const presentedFieldSchema: z.ZodType<PresentedField> = z.lazy(() =>
  z.object({ key: z.string(), label: z.string(), value: presentedValueSchema })
)

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

export type ReferencedEntries = Record<string, Record<string, Record<string, string>>>

export const submissionResponseSchema = z.object({
  submission: submissionSchema,
  fields: z.array(presentedFieldSchema)
})

export const submissionStatusChangeSchema = z.object({ status: z.string().min(1) })
