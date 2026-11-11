import { BLOCK_PREVIEW, type Locale } from '@studiobimo/backstage'

export const previewUrl = (origin: string, name: string, locale: Locale) =>
  `${origin}${BLOCK_PREVIEW.path}/${name}?${BLOCK_PREVIEW.localeParam}=${locale}`
