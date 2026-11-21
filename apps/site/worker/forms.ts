import { API_ERROR, type Form } from '@studiobimo/backstage'
import {
  adminRpc,
  EDGE_CACHE,
  findFormProjection,
  readFormPayload,
  requestContextOf,
  type SiteEnv
} from '@studiobimo/backstage/site'
import { rateLimited, type SiteApp } from '@studiobimo/backstage/site/hono'

import { FORM_ROUTE } from '../src/forms/route'

interface FormSource {
  readonly forms?: ReadonlyMap<string, Form>
  getForm?(name: string): Form | undefined
}

const complete = ({ forms, getForm }: FormSource) => ({
  forms: forms ?? new Map<string, Form>(),
  getForm: (name: string) => getForm?.(name)
})

const errorFor = (code: string) =>
  Object.values(API_ERROR).find((error) => error.code === code) ?? API_ERROR.internal

export const respondWithError = (
  c: { json: (body: unknown, status: number) => Response },
  error: { code: string; message: string; status: number },
  issues: unknown[] = []
) => c.json({ code: error.code, error: error.message, issues }, error.status)

export type FormBindings = Pick<Env, typeof FORM_ROUTE.limiter>

const adminOf = (env: SiteEnv) => (env.ADMIN ? adminRpc(env.ADMIN) : null)

export const formRoutes = (source: FormSource) => (app: SiteApp<FormBindings>) => {
  const registry = complete(source)
  return app
    .post(FORM_ROUTE.path, async (c) => {
      const limited = await rateLimited(c.env[FORM_ROUTE.limiter], c.req.raw)
      if (limited) return limited
      const name = c.req.param(FORM_ROUTE.param.name)
      const definition = registry.getForm(name)
      if (!definition) return respondWithError(c, API_ERROR.notFound)
      const read = await readFormPayload(c.req.raw, definition.schema)
      if (!read) return respondWithError(c, API_ERROR.invalid)
      const admin = adminOf(c.env)
      if (!admin) return respondWithError(c, API_ERROR.internal)
      const sent = await admin.submit(
        requestContextOf(c.req.raw),
        name,
        read.payload,
        read.turnstileToken
      )
      if (sent.ok) return c.json({ id: sent.id, token: sent.token }, FORM_ROUTE.status.created)
      return respondWithError(c, errorFor(sent.code), sent.issues)
    })
    .get(FORM_ROUTE.statusPath, async (c) => {
      const limited = await rateLimited(c.env[FORM_ROUTE.limiter], c.req.raw)
      if (limited) return limited
      const name = c.req.param(FORM_ROUTE.param.name)
      if (!registry.getForm(name)) return respondWithError(c, API_ERROR.notFound)
      const admin = adminOf(c.env)
      if (!admin) return respondWithError(c, API_ERROR.internal)
      const found = await admin.status(
        requestContextOf(c.req.raw),
        c.req.param(FORM_ROUTE.param.token)
      )
      if (!found.ok || found.form !== name) return respondWithError(c, API_ERROR.notFound)
      c.header('Cache-Control', EDGE_CACHE.form.status)
      return c.json({ status: found.status, fields: found.fields })
    })
    .get(FORM_ROUTE.projectionPath, async (c) => {
      const read = await findFormProjection(
        c.env.SITE,
        registry,
        c.req.param(FORM_ROUTE.param.name)
      )
      if (!read) return respondWithError(c, API_ERROR.notFound)
      c.header('Cache-Control', EDGE_CACHE.form.projection)
      return c.json(read)
    })
}
