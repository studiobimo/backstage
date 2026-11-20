import { z } from 'zod'

import { assertRenderable, NAME_PATTERN } from './blocks.ts'
import { INBOX } from './form-inbox.ts'
import type { FormRegistry } from './blocks.ts'
import { DURATION_MS } from './time.ts'
import type { SchemaNode } from './field-shapes.ts'

export const FORM = {
  defaultStatuses: ['new', 'confirmed', 'declined'],
  maxStatuses: 12,
  token: { defaultExpiresInDays: 30 },
  limits: { maxDays: 3650 }
} as const

type FieldKey<S extends z.ZodType> = z.ZodType extends S
  ? string
  : Extract<keyof z.input<S>, string>

type NotifySubject = string | ((payload: Record<string, unknown>) => string)

export interface FormNotify {
  to?: readonly string[]
  subject?: NotifySubject
  include?: readonly string[]
  exclude?: readonly string[]
  html?: boolean
}

interface FormNotifyDefinition<S extends z.ZodType> extends Omit<
  FormNotify,
  'include' | 'exclude'
> {
  include?: readonly FieldKey<S>[]
  exclude?: readonly FieldKey<S>[]
}

interface FormToken {
  expiresInDays: number
}

interface FormRetention {
  days: number
}

type InboxColumnDefinition<S extends z.ZodType> = FieldKey<S> | readonly [FieldKey<S>, FieldKey<S>]

interface FormInboxDefinition<S extends z.ZodType> {
  columns?: readonly InboxColumnDefinition<S>[]
  total?: { field: FieldKey<S>; money: string }
}

export interface FormInbox {
  columns: readonly (readonly string[])[]
  total?: { field: string; money: string }
}

export interface FormPublic {
  statuses: readonly string[]
  fields: readonly string[]
}

interface FormPublicDefinition<S extends z.ZodType> {
  statuses?: readonly string[]
  fields?: readonly FieldKey<S>[]
}

export interface FormDefinition<S extends z.ZodType = z.ZodType> {
  schema: S
  statuses?: readonly string[]
  notify?: FormNotifyDefinition<S>
  public?: FormPublicDefinition<S>
  inbox?: FormInboxDefinition<S>
  turnstile?: boolean
  token?: Partial<FormToken>
  retention?: FormRetention
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

export interface Form<S extends z.ZodType = z.ZodType, N extends string = string> {
  name: N
  schema: S
  statuses: readonly string[]
  notify?: FormNotify
  public: FormPublic
  inbox?: FormInbox
  turnstile: boolean
  token: FormToken
  retention?: FormRetention
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

const firstRepeated = (values: readonly string[]) =>
  values.find((value, index) => values.indexOf(value) !== index)

const assertStatuses = (name: string, statuses: readonly string[]) => {
  if (statuses.length === 0 || statuses.length > FORM.maxStatuses) {
    throw new Error(`Form "${name}" needs between 1 and ${FORM.maxStatuses} statuses`)
  }
  const bad = statuses.find((status) => !NAME_PATTERN.test(status))
  if (bad) {
    throw new Error(`Form "${name}" status "${bad}" must be lowercase letters, digits and hyphens`)
  }
  const repeated = firstRepeated(statuses)
  if (repeated) throw new Error(`Form "${name}" lists the status "${repeated}" twice`)
}

const assertNotify = (name: string, notify: FormNotify | undefined) => {
  if (notify?.to?.length === 0) throw new Error(`Form "${name}" notify.to needs an address`)
  const bad = notify?.to?.find((address) => !z.email().safeParse(address).success)
  if (bad) throw new Error(`Form "${name}" notifies "${bad}", which is not an email address`)
  if (typeof notify?.subject === 'string' && notify.subject.trim() === '')
    throw new Error(`Form "${name}" notify.subject is blank`)
}

const assertNotifyFields = (form: Form, properties: readonly string[]) => {
  for (const [option, fields] of Object.entries({
    include: form.notify?.include,
    exclude: form.notify?.exclude
  })) {
    const unknownField = fields?.find((field) => !properties.includes(field))
    if (unknownField) {
      throw new Error(
        `Form "${form.name}" notify.${option} "${unknownField}" is not a field of its schema`
      )
    }
  }
}

const assertDays = (name: string, label: string, days: number | undefined) => {
  if (days === undefined) return
  if (!Number.isInteger(days) || days < 1 || days > FORM.limits.maxDays) {
    throw new Error(
      `Form "${name}" ${label} must be a whole number of days from 1 to ${FORM.limits.maxDays}`
    )
  }
}

export const inboxOf = (form: Form): FormInbox => form.inbox ?? { columns: [] }

const assertInbox = (form: Form, schema: SchemaNode) => {
  const properties = schema.properties ?? {}
  const { columns, total } = inboxOf(form)
  if (columns.length > INBOX.columns.maxCount) {
    throw new Error(`Form "${form.name}" inbox shows at most ${INBOX.columns.maxCount} columns`)
  }
  const unknown = columns.flat().find((field) => !(field in properties))
  if (unknown) {
    throw new Error(`Form "${form.name}" inbox column "${unknown}" is not a field of its schema`)
  }
  if (!total) return
  const items = (properties[total.field] as SchemaNode | undefined)?.items as SchemaNode | undefined
  const amount = items?.properties?.[total.money] as SchemaNode | undefined
  if (amount?.backstage !== 'money') {
    throw new Error(
      `Form "${form.name}" inbox total needs "${total.field}" to be a list with a money field "${total.money}"`
    )
  }
}

const normalizeInbox = <S extends z.ZodType>(inbox: FormInboxDefinition<S>): FormInbox => ({
  columns: (inbox.columns ?? []).map((column) => (typeof column === 'string' ? [column] : column)),
  total: inbox.total
})

const assertPublic = (form: Form, properties: readonly string[]) => {
  const unknownStatus = form.public.statuses.find((status) => !form.statuses.includes(status))
  if (unknownStatus) {
    throw new Error(
      `Form "${form.name}" public status "${unknownStatus}" is not one of its statuses`
    )
  }
  const unknownField = form.public.fields.find((field) => !properties.includes(field))
  if (unknownField) {
    throw new Error(
      `Form "${form.name}" public field "${unknownField}" is not a field of its schema`
    )
  }
}

export function defineForm<S extends z.ZodType, const N extends string>(
  name: N,
  definition: FormDefinition<S>
): Form<S, N> {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`Form name "${name}" must be lowercase letters, digits and hyphens`)
  }
  const statuses = definition.statuses ?? FORM.defaultStatuses
  assertStatuses(name, statuses)
  assertNotify(name, definition.notify)
  assertDays(name, 'token.expiresInDays', definition.token?.expiresInDays)
  assertDays(name, 'retention.days', definition.retention?.days)
  const form: Form<S, N> = {
    name,
    schema: definition.schema,
    statuses,
    notify: definition.notify,
    public: {
      statuses: definition.public?.statuses ?? [],
      fields: definition.public?.fields ?? []
    },
    inbox: definition.inbox && normalizeInbox(definition.inbox),
    turnstile: definition.turnstile ?? true,
    token: { expiresInDays: definition.token?.expiresInDays ?? FORM.token.defaultExpiresInDays },
    retention: definition.retention,
    title: definition.title,
    description: definition.description
  }
  const schema = assertRenderable(form, 'Form')
  if (schema.type !== 'object') throw new Error(`Form "${name}" schema must be a z.object`)
  assertPublic(form, Object.keys(schema.properties ?? {}))
  assertInbox(form, schema)
  assertNotifyFields(form, Object.keys(schema.properties ?? {}))
  return form
}

export const formsOf = ({ forms }: Partial<FormRegistry>) => forms ?? new Map<string, Form>()

export const daysToMs = (days: number) => days * DURATION_MS.day

export const initialStatusOf = (form: Form) => form.statuses[0]!
