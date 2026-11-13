import { Hono } from 'hono'

import { BLOCK_PREVIEW, LAYOUT } from '../../blocks.ts'
import { API_ERROR } from '../../errors.ts'
import type { LocaleConfig } from '../../locales.ts'
import { MEDIA } from '../../media.ts'
import { SNAPSHOT, type Snapshot } from '../../publishing.ts'
import { renderPreview, type DocumentContext } from './document.tsx'
import { respondWithError } from './respond.ts'
import type { SiteEnv } from '../index.ts'

const SVG_CONTENT_TYPE = 'image/svg+xml'
const ONE_DAY_SECONDS = 86_400
const ONE_WEEK_SECONDS = 604_800

const THUMBNAIL = {
  cacheControl: `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_WEEK_SECONDS}`
} as const

const PREVIEW_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
} as const

export interface SitePreview {
  samples: Readonly<Record<string, unknown>>
  media: Snapshot['media']
  thumbnails?: Readonly<Record<string, string>>
  assets?: Readonly<Record<string, string>>
}

const ownValue = <T>(record: Readonly<Record<string, T>> | undefined, key: string) =>
  record && Object.hasOwn(record, key) ? record[key] : undefined

const localeOf = (value: string | undefined, { locales, defaultLocale }: LocaleConfig) =>
  locales.find((locale) => locale === value) ?? defaultLocale

const snapshotOfSample = (
  name: string,
  version: number,
  locale: string,
  { samples, media }: SitePreview
): Snapshot => ({
  format: SNAPSHOT.format,
  pageId: name,
  isHome: false,
  slug: name,
  title: name,
  layout: LAYOUT.default,
  version: 1,
  publishedAt: 0,
  seo: { title: '', description: '', socialImageId: null },
  blocks: [
    {
      id: name,
      block: name,
      schemaVersion: version,
      content: samples[name] as Snapshot['blocks'][number]['content']
    }
  ],
  media,
  locale
})

export const previewRoutes = (preview: SitePreview, context: DocumentContext) => {
  const routes = new Hono<{ Bindings: SiteEnv }>()
  for (const [path, svg] of Object.entries(preview.assets ?? {})) {
    routes.get(`/${path}`, (c) =>
      c.body(svg, 200, { 'Content-Type': SVG_CONTENT_TYPE, 'Cache-Control': MEDIA.cacheControl })
    )
  }
  return routes
    .get(`${BLOCK_PREVIEW.path}/:name/${BLOCK_PREVIEW.thumbnailFile}`, (c) => {
      const svg = ownValue(preview.thumbnails, c.req.param('name'))
      if (!svg) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
      return c.body(svg, 200, {
        'Content-Type': SVG_CONTENT_TYPE,
        'Cache-Control': THUMBNAIL.cacheControl
      })
    })
    .get(`${BLOCK_PREVIEW.path}/:name`, (c) => {
      const name = c.req.param('name')
      const block =
        ownValue(preview.samples, name) === undefined
          ? undefined
          : context.components.registry.get(name)
      if (!block) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
      const locale = localeOf(c.req.query(BLOCK_PREVIEW.localeParam), context.locales)
      return renderPreview(
        { ...context, snapshot: snapshotOfSample(name, block.version, locale, preview) },
        PREVIEW_HEADERS
      )
    })
}
