import { API_ERROR, type Form } from '@studiobimo/backstage'
import {
  adminRpc,
  requestContextOf,
  type SiteEnv,
  type VisitorRpc
} from '@studiobimo/backstage/site'
import type { SiteApp } from '@studiobimo/backstage/site/hono'
import type { z } from 'zod'

import { FORM_ROUTE } from '../src/forms/route'

const adminOf = (env: SiteEnv) => adminRpc((env as unknown as { ADMIN: VisitorRpc }).ADMIN)

const errorFor = (code: string) =>
  Object.values(API_ERROR).find((error) => error.code === code) ?? API_ERROR.internal

const respondWithError = (
  c: { json: (body: unknown, status: number) => Response },
  error: { code: string; message: string; status: number },
  issues: unknown[] = []
) => c.json({ code: error.code, error: error.message, issues }, error.status)

const unwrapped = (schema: z.ZodType): z.ZodType => {
  const def = schema._zod.def as { type: string; innerType?: z.ZodType }
  return def.innerType ? unwrapped(def.innerType) : schema
}

const kindOf = (schema: z.ZodType) => (unwrapped(schema)._zod.def as { type: string }).type

const shapeOf = (schema: z.ZodType): Record<string, z.ZodType> =>
  kindOf(schema) === 'object' ? (unwrapped(schema) as z.ZodObject).shape : {}

const coerce = (kind: string, raw: string): unknown => {
  if (kind === 'number') return raw === '' ? undefined : Number(raw)
  if (kind === 'boolean') return raw === 'on' || raw === 'true'
  return raw
}

const payloadOf = (schema: z.ZodType, form: FormData) =>
  Object.fromEntries(
    Object.entries(shapeOf(schema)).flatMap(([key, field]) => {
      const raw = form.get(key)
      return typeof raw === 'string' ? [[key, coerce(kindOf(field), raw)]] : []
    })
  )

export const formRoutes = (forms: ReadonlyMap<string, Form> | undefined) => (app: SiteApp) =>
  app.post(FORM_ROUTE.path, async (c) => {
    const name = c.req.param('name')
    const definition = forms?.get(name)
    if (!definition) return respondWithError(c, API_ERROR.notFound)
    const form = await c.req.formData()
    const turnstileToken = form.get(FORM_ROUTE.field.turnstile)?.toString() ?? null
    const sent = await adminOf(c.env).submit(
      requestContextOf(c.req.raw),
      name,
      payloadOf(definition.schema, form),
      turnstileToken
    )
    if (sent.ok) return c.json({ id: sent.id, token: sent.token }, FORM_ROUTE.status.created)
    return respondWithError(c, errorFor(sent.code), sent.issues)
  })
