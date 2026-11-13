import type { Locale } from '@studiobimo/backstage'
import { BLOCK_PREVIEW } from '@studiobimo/backstage/internal'

export const previewUrl = (origin: string, name: string, locale: Locale) =>
  `${origin}${BLOCK_PREVIEW.path}/${name}?${BLOCK_PREVIEW.localeParam}=${locale}`
