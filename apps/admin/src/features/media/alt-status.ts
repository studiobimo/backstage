import type { Media } from '@studiobimo/backstage/internal'

export const ALT_STATUS = {
  described: 'described',
  missing: 'missing',
  decorative: 'decorative'
} as const

export type AltStatus = (typeof ALT_STATUS)[keyof typeof ALT_STATUS]

export function altStatusOf(
  { decorative, alt }: Pick<Media, 'decorative' | 'alt'>,
  locales: readonly string[]
): AltStatus {
  if (decorative) return ALT_STATUS.decorative
  const described = locales.every((locale) => (alt[locale] ?? '').trim() !== '')
  return described ? ALT_STATUS.described : ALT_STATUS.missing
}

export function filterMedia<T extends Pick<Media, 'filename' | 'alt'>>(items: T[], query: string) {
  const needle = query.trim().toLowerCase()
  if (needle === '') return items
  return items.filter(({ filename, alt }) =>
    [filename, ...Object.values(alt)].some((text) => text.toLowerCase().includes(needle))
  )
}

export const usedBytesOf = (items: readonly Pick<Media, 'size'>[]) =>
  items.reduce((total, { size }) => total + size, 0)
