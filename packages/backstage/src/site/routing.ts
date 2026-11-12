import { DEFAULT_LOCALE, LOCALES, PAGE, type Locale } from '../pages.ts'

export interface Route {
  locale: Locale
  slug: string | null
}

const MAX_SLUG_SEGMENTS = 1

const isSlug = (slug: string) => slug.length <= PAGE.slug.maxLength && PAGE.slug.pattern.test(slug)

export function parseRoute(path: string): Route | null {
  const segments = path.split('/').filter(Boolean)
  const prefix = LOCALES.find((locale) => locale === segments[0])
  if (prefix === DEFAULT_LOCALE) return null
  const rest = prefix ? segments.slice(1) : segments
  if (rest.length > MAX_SLUG_SEGMENTS) return null
  const slug = rest[0] ?? null
  if (slug !== null && !isSlug(slug)) return null
  return { locale: prefix ?? DEFAULT_LOCALE, slug }
}

export const routeOf = (request: Request) => parseRoute(new URL(request.url).pathname)

export const pathOf = ({ locale, slug }: Route) =>
  ['', ...(locale === DEFAULT_LOCALE ? [] : [locale]), ...(slug ? [slug] : [])].join('/') || '/'
