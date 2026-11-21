import { classifyField, humanize, INBOX } from '@studiobimo/backstage/internal'

import type { i18n as I18n, TFunction } from 'i18next'

import { collectionTitle } from '../collections/collection-text'
import type { JsonSchema } from '../block-form/spec'

export const formTitle = collectionTitle

export const STATUS = { new: 'new', confirmed: 'confirmed', declined: 'declined' } as const

export const statusLabel = (instance: I18n, t: TFunction, status: string) => {
  const key = `status.${status}`
  return instance.exists(key, { ns: 'forms' }) ? t(key, { ns: 'forms' }) : humanize(status)
}

export const fieldLabel = (key: string, node?: JsonSchema) => node?.title ?? humanize(key)

const fieldEntries = (schema: JsonSchema) => Object.entries(schema.properties ?? {})

const parseDay = (value: string) => new Date(`${value}T00:00:00Z`)

const formatDay = (language: string, value: string, dateStyle: 'full' | 'medium' = 'full') =>
  new Intl.DateTimeFormat(language, { dateStyle, timeZone: 'UTC' }).format(parseDay(value))

const SCALAR_SHAPES = ['string', 'number', 'integer', 'select']

const FORM_COLUMNS = { max: 4 } as const

export const columnsOf = (schema: JsonSchema) =>
  fieldEntries(schema)
    .filter(([, node]) => SCALAR_SHAPES.includes(classifyField(node)))
    .slice(0, FORM_COLUMNS.max)

export const cellText = (node: JsonSchema, value: unknown, language: string) => {
  if (value === undefined || value === null || value === '') return ''
  const text = String(value)
  return node.format === INBOX.dateFormat ? formatDay(language, text, 'medium') : text
}
