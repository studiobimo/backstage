import type { z } from 'zod'

export const FORM_PAYLOAD = {
  turnstileField: 'cf-turnstile-response',
  contentType: { json: 'application/json' },
  structuredKinds: ['array', 'object', 'record', 'tuple'],
  booleanTruthy: ['on', 'true']
} as const

export interface FormPayload {
  payload: Record<string, unknown>
  turnstileToken: string | null
}

type Wrapped = { type: string; innerType?: z.ZodType }

const unwrapped = (schema: z.ZodType): z.ZodType => {
  const def = schema._zod.def as Wrapped
  return def.innerType ? unwrapped(def.innerType) : schema
}

const kindOf = (schema: z.ZodType) => (unwrapped(schema)._zod.def as Wrapped).type

const shapeOf = (schema: z.ZodType): Record<string, z.ZodType> =>
  kindOf(schema) === 'object' ? (unwrapped(schema) as z.ZodObject).shape : {}

const isStructured = (kind: string) =>
  (FORM_PAYLOAD.structuredKinds as readonly string[]).includes(kind)

const parsedJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const coerce = (kind: string, raw: string): unknown => {
  if (kind === 'number') return raw === '' ? undefined : Number(raw)
  if (kind === 'boolean') return (FORM_PAYLOAD.booleanTruthy as readonly string[]).includes(raw)
  if (isStructured(kind)) return parsedJson(raw)
  return raw
}

const tokenOf = (value: unknown) => (typeof value === 'string' ? value : null)

const coercedFieldsOf = (schema: z.ZodType, form: FormData) => {
  const fields: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(shapeOf(schema))) {
    const raw = form.get(key)
    if (typeof raw === 'string') fields[key] = coerce(kindOf(field), raw)
  }
  return fields
}

const fromFormData = (schema: z.ZodType, form: FormData): FormPayload => ({
  payload: coercedFieldsOf(schema, form),
  turnstileToken: tokenOf(form.get(FORM_PAYLOAD.turnstileField))
})

const fromJson = (body: unknown): FormPayload | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const { [FORM_PAYLOAD.turnstileField]: token, ...payload } = body as Record<string, unknown>
  return { payload, turnstileToken: tokenOf(token) }
}

const isJson = (request: Request) =>
  request.headers.get('content-type')?.includes(FORM_PAYLOAD.contentType.json) ?? false

export const readFormPayload = async (
  request: Request,
  schema: z.ZodType
): Promise<FormPayload | null> => {
  try {
    return isJson(request)
      ? fromJson(await request.json())
      : fromFormData(schema, await request.formData())
  } catch {
    return null
  }
}
