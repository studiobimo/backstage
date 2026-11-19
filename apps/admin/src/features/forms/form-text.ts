import { classifyField, INBOX } from '@studiobimo/backstage/internal'

import type { i18n as I18n, TFunction } from 'i18next'

import { collectionTitle } from '../collections/collection-text'
import type { JsonSchema } from '../block-form/spec'

export const formTitle = collectionTitle

export const STATUS = { new: 'new', confirmed: 'confirmed', declined: 'declined' } as const

const WORD_BREAK = /([a-z0-9])([A-Z])|[-_]+/g

const humanize = (key: string) => {
  const spaced = key.replace(WORD_BREAK, (_match, lower: string | undefined, upper: string) =>
    lower ? `${lower} ${upper.toLowerCase()}` : ' '
  )
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const statusLabel = (instance: I18n, t: TFunction, status: string) => {
  const key = `status.${status}`
  return instance.exists(key, { ns: 'forms' }) ? t(key, { ns: 'forms' }) : humanize(status)
}

export const fieldLabel = (key: string, node?: JsonSchema) => node?.title ?? humanize(key)

export const fieldEntries = (schema: JsonSchema) => Object.entries(schema.properties ?? {})

const parseDay = (value: string) => new Date(`${value}T00:00:00Z`)

export const formatDay = (language: string, value: string, dateStyle: 'full' | 'medium' = 'full') =>
  new Intl.DateTimeFormat(language, { dateStyle, timeZone: 'UTC' }).format(parseDay(value))

const SUMMARY_SEPARATOR = ' · '
const SCALAR_SHAPES = ['string', 'number', 'integer', 'select']

export const summaryOf = (schema: JsonSchema, payload: Record<string, unknown>, language: string) =>
  fieldEntries(schema)
    .filter(([key, node]) => SCALAR_SHAPES.includes(classifyField(node)) && payload[key] != null)
    .map(([key, node]) => {
      const value = String(payload[key])
      return node.format === INBOX.dateFormat ? formatDay(language, value, 'medium') : value
    })
    .join(SUMMARY_SEPARATOR)
