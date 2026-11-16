import type { CollectionRoute } from '../entry-pages.ts'
import type { LocaleConfig } from '../locales.ts'
import { LOCALE } from '../locales.ts'
import {
  buildRobots,
  buildSitemap,
  EMPTY_PUBLISHED_INDEX,
  entryTarget,
  publishedIndexSchema,
  SEO
} from '../seo.ts'
import type { KvReader } from './store.ts'

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8'
const TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8'

const originOf = (request: Request) => new URL(request.url).origin

const headersFor = (contentType: string) => ({
  'Content-Type': contentType,
  'Cache-Control': SEO.cacheControl
})

const readPublishedIndex = async (kv: KvReader) => {
  const parsed = publishedIndexSchema.safeParse(await kv.get(SEO.indexKey, { type: 'json' }))
  return parsed.success ? parsed.data : EMPTY_PUBLISHED_INDEX
}

export const readPublishedPages = async (kv: KvReader) => (await readPublishedIndex(kv)).pages

export const respondWithSitemap = async (
  kv: KvReader,
  request: Request,
  config: LocaleConfig = LOCALE.default,
  routes: Readonly<Record<string, CollectionRoute>> = {}
) => {
  const index = await readPublishedIndex(kv)
  const entries = (index.entries ?? []).flatMap((entry) => {
    const route = routes[entry.collection]
    return route ? [entryTarget(entry, route, config.defaultLocale)] : []
  })
  return new Response(buildSitemap(originOf(request), index.pages, config, entries), {
    headers: headersFor(XML_CONTENT_TYPE)
  })
}

export const respondWithRobots = (request: Request) =>
  new Response(buildRobots(originOf(request)), { headers: headersFor(TEXT_CONTENT_TYPE) })
