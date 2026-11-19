import { z } from 'zod'

import type { Form } from './forms.ts'

export const FORM_PROJECTION = {
  format: 1,
  key: { prefix: 'form', separator: ':' }
} as const

export const formProjectionKey = (form: string) =>
  [FORM_PROJECTION.key.prefix, form].join(FORM_PROJECTION.key.separator)

export const formProjectionSchema = z.object({
  format: z.literal(FORM_PROJECTION.format),
  form: z.string(),
  publishedAt: z.number().int(),
  entries: z.array(z.record(z.string(), z.unknown()))
})
export type FormProjection = z.infer<typeof formProjectionSchema>

export const isProjected = (form: Form) =>
  form.public.statuses.length > 0 && form.public.fields.length > 0

export const publicFieldsOf = (form: Form, payload: Record<string, unknown>) =>
  Object.fromEntries(
    form.public.fields.filter((field) => field in payload).map((field) => [field, payload[field]])
  )

export const projectionOf = (
  form: Form,
  payloads: readonly Record<string, unknown>[],
  publishedAt: number
): FormProjection => ({
  format: FORM_PROJECTION.format,
  form: form.name,
  publishedAt,
  entries: payloads.map((payload) => publicFieldsOf(form, payload))
})
