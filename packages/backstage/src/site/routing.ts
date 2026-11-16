import { routePrefixOf, type CollectionRoute } from '../entry-pages.ts'
import { LOCALE, type Locale, type LocaleConfig } from '../locales.ts'
import { PAGE } from '../pages.ts'

export interface Route {
  locale: Locale
  slug: string | null
}

const MAX_SLUG_SEGMENTS = 1

const isSlug = (slug: string) => slug.length <= PAGE.slug.maxLength && PAGE.slug.pattern.test(slug)

const withoutLocale = (path: string, config: LocaleConfig) => {
  const segments = path.split('/').filter(Boolean)
  const prefix = config.locales.find((locale) => locale === segments[0])
  if (prefix === config.defaultLocale) return null
  return {
    locale: prefix ?? config.defaultLocale,
    rest: prefix ? segments.slice(1) : segments
  }
}

export function parseRoute(path: string, config: LocaleConfig = LOCALE.default): Route | null {
  const located = withoutLocale(path, config)
  if (!located || located.rest.length > MAX_SLUG_SEGMENTS) return null
  const slug = located.rest[0] ?? null
  if (slug !== null && !isSlug(slug)) return null
  return { locale: located.locale, slug }
}

export interface EntryRoute {
  collection: string
  locale: Locale
  slug: string
}

export function parseEntryRoute(
  path: string,
  routes: Readonly<Record<string, CollectionRoute>>,
  config: LocaleConfig = LOCALE.default
): EntryRoute | null {
  const located = withoutLocale(path, config)
  if (!located) return null
  const slug = located.rest.at(-1)
  const fixed = located.rest.slice(0, -1)
  if (!slug || !isSlug(slug)) return null
  const match = Object.entries(routes).find(([, route]) => {
    const prefix = routePrefixOf(route)
    return prefix.length === fixed.length && prefix.every((segment, i) => segment === fixed[i])
  })
  return match ? { collection: match[0], locale: located.locale, slug } : null
}

export const routeOf = (request: Request, config: LocaleConfig = LOCALE.default) =>
  parseRoute(new URL(request.url).pathname, config)

export const pathOf = (
  { locale, slug }: Route,
  { defaultLocale }: Pick<LocaleConfig, 'defaultLocale'> = LOCALE.default
) => ['', ...(locale === defaultLocale ? [] : [locale]), ...(slug ? [slug] : [])].join('/') || '/'
