import { Hono, type Context } from 'hono'

import { schemaNodeOf } from '../blocks.ts'
import type { AdminRegistry } from '../collections.ts'
import { readEntryLabels } from '../db/entries.ts'
import {
  countSubmissionsByStatus,
  findSubmission,
  listSubmissions,
  type Submission
} from '../db/submissions.ts'
import { ensureUser, listUsers } from '../db/users.ts'
import { API_ERROR, fieldIssuesOf } from '../errors.ts'
import type { SchemaNode } from '../field-shapes.ts'
import {
  INBOX,
  inboxFilterSchema,
  submissionStatusChangeSchema,
  type FormDescription,
  type InboxSubmission,
  type ReferencedEntries
} from '../form-inbox.ts'
import { formsOf, initialStatusOf, type Form } from '../forms.ts'
import { REFERENCE, referenceFieldsIn } from '../references.ts'
import type { AccessEnv } from './auth.ts'
import { readJsonBody, respondInvalid, respondWithError } from './respond.ts'
import { setSubmissionStatus } from './submissions.ts'

const dateFieldOf = (form: Form) => {
  const properties = schemaNodeOf(form.schema).properties ?? {}
  const found = Object.entries(properties).find(
    ([, node]) => typeof node !== 'boolean' && node.format === INBOX.dateFormat
  )
  return found?.[0] ?? null
}

const describeForm = (
  form: Form,
  counts: readonly { form: string; status: string; total: number }[]
): FormDescription => {
  const newStatus = initialStatusOf(form)
  return {
    name: form.name,
    title: form.title,
    description: form.description,
    statuses: [...form.statuses],
    newStatus,
    newCount: counts.find((row) => row.form === form.name && row.status === newStatus)?.total ?? 0,
    dateField: dateFieldOf(form),
    schema: schemaNodeOf(form.schema)
  }
}

const formOf = (registry: AdminRegistry, c: Context) => {
  const form = formsOf(registry).get(c.req.param('name') ?? '')
  return form
    ? ({ ok: true, form } as const)
    : ({ ok: false, response: respondWithError(c, API_ERROR.notFound) } as const)
}

const presentSubmission = (
  row: Submission,
  names: ReadonlyMap<string, string>
): InboxSubmission => ({
  ...row,
  updatedBy: (row.updatedBy && names.get(row.updatedBy)) || null
})

const editorNamesOf = async (c: Context<AccessEnv>) =>
  new Map((await listUsers(c.env.DB)).map((user) => [user.id, user.name || user.email]))

const referencedEntriesOf = async (
  c: Context<AccessEnv>,
  form: Form,
  submission: Submission
): Promise<ReferencedEntries> => {
  const fields = referenceFieldsIn(
    schemaNodeOf(form.schema) as SchemaNode,
    form.name,
    submission.payload
  )
  const wanted = fields.flatMap(({ collection, value }) =>
    value.mode === REFERENCE.mode.chosen ? value.ids.map((id) => ({ collection, id })) : []
  )
  const found = await readEntryLabels(
    c.env.DB,
    wanted.map(({ id }) => id)
  )
  const entries: ReferencedEntries = {}
  for (const { collection, id } of wanted) {
    const entry = found.find((row) => row.id === id && row.collection === collection)
    if (entry) (entries[collection] ??= {})[id] = entry.label
  }
  return entries
}

const submissionOf = async (c: Context<AccessEnv>, form: Form) => {
  const submission = await findSubmission(c.env.DB, c.req.param('id') ?? '')
  return submission && submission.form === form.name ? submission : null
}

export const formsRoutes = (registry: AdminRegistry) =>
  new Hono<AccessEnv>()
    .get('/', async (c) => {
      const counts = await countSubmissionsByStatus(c.env.DB)
      return c.json({
        forms: [...formsOf(registry).values()].map((form) => describeForm(form, counts))
      })
    })
    .get('/:name/submissions', async (c) => {
      const found = formOf(registry, c)
      if (!found.ok) return found.response
      const filter = inboxFilterSchema.safeParse(c.req.query())
      if (!filter.success) return respondInvalid(c, fieldIssuesOf(filter.error))
      const { status, from, to } = filter.data
      const field = dateFieldOf(found.form)
      const range = field && (from || to) ? { field, from, to } : undefined
      const rows = await listSubmissions(
        c.env.DB,
        found.form.name,
        status,
        range,
        INBOX.maxSubmissions
      )
      const names = await editorNamesOf(c)
      return c.json({ submissions: rows.map((row) => presentSubmission(row, names)) })
    })
    .get('/:name/submissions/:id', async (c) => {
      const found = formOf(registry, c)
      if (!found.ok) return found.response
      const submission = await submissionOf(c, found.form)
      if (!submission) return respondWithError(c, API_ERROR.notFound)
      return c.json({
        submission: presentSubmission(submission, await editorNamesOf(c)),
        entries: await referencedEntriesOf(c, found.form, submission)
      })
    })
    .put('/:name/submissions/:id/status', async (c) => {
      const found = formOf(registry, c)
      if (!found.ok) return found.response
      const body = await readJsonBody(c, submissionStatusChangeSchema)
      if (!body.ok) return body.response
      const existing = await submissionOf(c, found.form)
      if (!existing) return respondWithError(c, API_ERROR.notFound)
      const result = await setSubmissionStatus(
        c.env.DB,
        c.env.SITE,
        registry,
        existing.id,
        body.data.status,
        { editorId: await ensureUser(c.env.DB, c.get('editor')) }
      )
      if (!result.ok) {
        return respondWithError(
          c,
          result.code === API_ERROR.notFound.code ? API_ERROR.notFound : API_ERROR.invalid
        )
      }
      return c.json({ submission: presentSubmission(result.submission, await editorNamesOf(c)) })
    })
