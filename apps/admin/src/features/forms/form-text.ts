import { humanize } from '@studiobimo/backstage/internal'

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
