import type { AnyD1Database } from 'drizzle-orm/d1'

import { listSubmissions } from '../db/submissions.ts'
import { formProjectionKey, isProjected, projectionOf } from '../form-projection.ts'
import type { Form } from '../forms.ts'

const publicPayloadsOf = async (d1: AnyD1Database, form: Form) => {
  const perStatus = await Promise.all(
    form.public.statuses.map((status) => listSubmissions(d1, form.name, status))
  )
  return perStatus
    .flat()
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map(({ payload }) => payload)
    .filter((payload) => Object.keys(payload).length > 0)
}

export const publishFormProjection = async (
  d1: AnyD1Database,
  kv: KVNamespace,
  form: Form,
  now: number
) => {
  if (!isProjected(form)) return
  const projection = projectionOf(form, await publicPayloadsOf(d1, form), now)
  await kv.put(formProjectionKey(form.name), JSON.stringify(projection))
}
