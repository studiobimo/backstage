import type { TFunction } from 'i18next'

import { formatBytes } from '@/lib/format'

interface ImageDimensions {
  width: number
  height: number
  size: number
}

export const imageDetailOf = (
  { width, height, size }: ImageDimensions,
  language: string,
  t: TFunction<'media'>
) => t('details', { width, height, size: formatBytes(language, size) })
