import type { Locale } from './locales.ts'
import { PAGE, slugify } from './pages.ts'

export interface CollectionRoute {
  path: string
}

const ENTRY_ROUTE = {
  separator: '/',
  slugParam: ':slug',
  reservedSegments: ['media', 'health'],
  firstSuffix: 2
} as const

const prefixOf = (path: string) => path.split(ENTRY_ROUTE.separator).slice(1, -1)

const routeProblemOf = (path: string): string | null => {
  const segments = path.split(ENTRY_ROUTE.separator)
  const prefix = prefixOf(path)
  if (segments[0] !== '') return 'must start with a slash'
  if (segments.at(-1) !== ENTRY_ROUTE.slugParam) return `must end with ${ENTRY_ROUTE.slugParam}`
  if (prefix.length === 0) return 'needs at least one fixed segment before the slug'
  if (!prefix.every((segment) => PAGE.slug.pattern.test(segment))) {
    return 'may only use lowercase letters, digits and hyphens in its fixed segments'
  }
  const [first] = prefix
  return first && ENTRY_ROUTE.reservedSegments.some((reserved) => reserved === first)
    ? `starts with "${first}", which the site reserves`
    : null
}

export function assertEntryRoute(collection: string, { path }: CollectionRoute) {
  const problem = routeProblemOf(path)
  if (problem) throw new Error(`Collection "${collection}" route "${path}" ${problem}`)
}

export const routePrefixOf = ({ path }: CollectionRoute) => prefixOf(path)

export const entryRoutePath = (route: CollectionRoute, slug: string) =>
  [...routePrefixOf(route), slug].join(ENTRY_ROUTE.separator)

export const entryPathOf = (
  route: CollectionRoute,
  slug: string,
  locale: Locale,
  defaultLocale: Locale
) =>
  ['', ...(locale === defaultLocale ? [] : [locale]), entryRoutePath(route, slug)].join(
    ENTRY_ROUTE.separator
  )

interface RouteOwner {
  name: string
  route?: CollectionRoute | undefined
}

export function assertRoutesAvailable(
  collections: Iterable<RouteOwner>,
  locales: readonly Locale[]
) {
  const owners = new Map<string, string>()
  for (const { name, route } of collections) {
    if (!route) continue
    const [first] = routePrefixOf(route)
    if (first && locales.includes(first)) {
      throw new Error(
        `Collection "${name}" route "${route.path}" starts with the locale "${first}"`
      )
    }
    const owner = owners.get(route.path)
    if (owner) {
      throw new Error(`Collections "${owner}" and "${name}" both use the route "${route.path}"`)
    }
    owners.set(route.path, name)
  }
}

export const routesOf = (collections: Iterable<RouteOwner>): Record<string, CollectionRoute> =>
  Object.fromEntries([...collections].flatMap(({ name, route }) => (route ? [[name, route]] : [])))

export const deriveEntrySlug = (
  labels: Readonly<Record<string, string>>,
  locale: Locale,
  defaultLocale: Locale
) => slugify(labels[locale] ?? labels[defaultLocale] ?? '') || null

export const freeSlug = (base: string, taken: ReadonlySet<string>) => {
  if (!taken.has(base)) return base
  for (let n = ENTRY_ROUTE.firstSuffix; ; n += 1) {
    const suffix = `-${n}`
    const candidate = `${base.slice(0, PAGE.slug.maxLength - suffix.length)}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}
