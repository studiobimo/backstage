export const HEADING_LEVEL = { page: 1, block: 2, content: 3 } as const

const NAV_LABEL = {
  fallbackLocale: 'en',
  primary: { en: 'Main', es: 'Principal' } as Readonly<Record<string, string>>
} as const

export const primaryNavLabel = (locale: string) =>
  NAV_LABEL.primary[locale] ?? NAV_LABEL.primary[NAV_LABEL.fallbackLocale]
