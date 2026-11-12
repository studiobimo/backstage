import {
  API_ERROR,
  MEDIA,
  BLOCK_PREVIEW,
  DEFAULT_LOCALE,
  LOCALES,
  SNAPSHOT,
  type Locale,
  type Snapshot
} from '@studiobimo/backstage'
import { Hono } from 'hono'

import { components } from '../src/blocks/component-map'
import oneColumnSection from '../src/blocks/one-column-section/thumbnail.svg?raw'
import oneColumnText from '../src/blocks/one-column-text/thumbnail.svg?raw'
import overlayHero from '../src/blocks/overlay-hero/thumbnail.svg?raw'
import photo from '../src/blocks/preview-photo.svg?raw'
import splitHero from '../src/blocks/split-hero/thumbnail.svg?raw'
import twoColumnSection from '../src/blocks/two-column-section/thumbnail.svg?raw'
import twoColumnText from '../src/blocks/two-column-text/thumbnail.svg?raw'
import { PREVIEW_PHOTO } from '../src/blocks/sample-support'
import { PREVIEW_MEDIA, PREVIEW_SAMPLES } from '../src/blocks/samples'
import { renderPreview } from './page'
import { respondWithError } from './respond'

export const THUMBNAIL = {
  file: 'thumbnail.svg',
  contentType: 'image/svg+xml',
  cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
} as const

const BLOCK_THUMBNAILS: ReadonlyMap<string, string> = new Map([
  ['one-column-section', oneColumnSection],
  ['one-column-text', oneColumnText],
  ['overlay-hero', overlayHero],
  ['split-hero', splitHero],
  ['two-column-section', twoColumnSection],
  ['two-column-text', twoColumnText]
])

const thumbnailOf = (blockName: string) => BLOCK_THUMBNAILS.get(blockName)

const PREVIEW_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
} as const

const localeOf = (value: string | undefined): Locale =>
  LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE

const snapshotOfSample = (name: string, version: number, locale: Locale): Snapshot => ({
  format: SNAPSHOT.format,
  pageId: name,
  isHome: false,
  slug: name,
  title: name,
  layout: 'bare',
  version: 1,
  publishedAt: 0,
  seo: { title: '', description: '', socialImageId: null },
  blocks: [
    {
      id: name,
      block: name,
      schemaVersion: version,
      content: PREVIEW_SAMPLES[name] as Snapshot['blocks'][number]['content']
    }
  ],
  media: PREVIEW_MEDIA,
  locale
})

export const previewRoutes = new Hono<{ Bindings: Env }>()
  .get(`/${PREVIEW_PHOTO.path}`, (c) =>
    c.body(photo, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': MEDIA.cacheControl })
  )
  .get(`${BLOCK_PREVIEW.path}/:name/${THUMBNAIL.file}`, (c) => {
    const svg = thumbnailOf(c.req.param('name'))
    if (!svg) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
    return c.body(svg, 200, {
      'Content-Type': THUMBNAIL.contentType,
      'Cache-Control': THUMBNAIL.cacheControl
    })
  })
  .get(`${BLOCK_PREVIEW.path}/:name`, (c) => {
    const name = c.req.param('name')
    const block = PREVIEW_SAMPLES[name] === undefined ? undefined : components.registry.get(name)
    if (!block) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
    const locale = localeOf(c.req.query(BLOCK_PREVIEW.localeParam))
    return renderPreview(
      { components, snapshot: snapshotOfSample(name, block.version, locale) },
      PREVIEW_HEADERS
    )
  })
