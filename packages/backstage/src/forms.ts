import { z } from 'zod'

import { assertRenderable, NAME_PATTERN } from './blocks.ts'
import type { FormRegistry } from './blocks.ts'

export const FORM = {
  defaultStatuses: ['new', 'confirmed', 'declined'],
  maxStatuses: 12
} as const

type FieldKey<S extends z.ZodType> = z.ZodType extends S
  ? string
  : Extract<keyof z.input<S>, string>

export interface FormNotify {
  to?: readonly string[]
  subject?: string
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
  notify?: FormNotify
  public?: FormPublicDefinition<S>
  turnstile?: boolean
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

export interface Form<S extends z.ZodType = z.ZodType, N extends string = string> {
  name: N
  schema: S
  statuses: readonly string[]
  notify?: FormNotify
  public: FormPublic
  turnstile: boolean
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
  if (notify?.subject?.trim() === '') throw new Error(`Form "${name}" notify.subject is blank`)
}

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
  const form: Form<S, N> = {
    name,
    schema: definition.schema,
    statuses,
    notify: definition.notify,
    public: {
      statuses: definition.public?.statuses ?? [],
      fields: definition.public?.fields ?? []
    },
    turnstile: definition.turnstile ?? true,
    title: definition.title,
    description: definition.description
  }
  const schema = assertRenderable(form, 'Form')
  if (schema.type !== 'object') throw new Error(`Form "${name}" schema must be a z.object`)
  assertPublic(form, Object.keys(schema.properties ?? {}))
  return form
}

export const formsOf = ({ forms }: Partial<FormRegistry>) => forms ?? new Map<string, Form>()

export const initialStatusOf = (form: Form) => form.statuses[0]!
