import { LOCALE, type Locale, type LocaleConfig } from '../locales.ts'
import { PAGE } from '../pages.ts'

export interface Route {
  locale: Locale
  slug: string | null
}

const MAX_SLUG_SEGMENTS = 1

const isSlug = (slug: string) => slug.length <= PAGE.slug.maxLength && PAGE.slug.pattern.test(slug)

export function parseRoute(path: string, config: LocaleConfig = LOCALE.default): Route | null {
  const segments = path.split('/').filter(Boolean)
  const prefix = config.locales.find((locale) => locale === segments[0])
  if (prefix === config.defaultLocale) return null
  const rest = prefix ? segments.slice(1) : segments
  if (rest.length > MAX_SLUG_SEGMENTS) return null
  const slug = rest[0] ?? null
  if (slug !== null && !isSlug(slug)) return null
  return { locale: prefix ?? config.defaultLocale, slug }
}

export const routeOf = (request: Request, config: LocaleConfig = LOCALE.default) =>
  parseRoute(new URL(request.url).pathname, config)

export const pathOf = (
  { locale, slug }: Route,
  { defaultLocale }: Pick<LocaleConfig, 'defaultLocale'> = LOCALE.default
) => ['', ...(locale === defaultLocale ? [] : [locale]), ...(slug ? [slug] : [])].join('/') || '/'
