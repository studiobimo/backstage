import {
  API_ERROR,
  BLOCK_PREVIEW,
  DEFAULT_LOCALE,
  LOCALES,
  SNAPSHOT,
  type Locale,
  type Snapshot
} from '@studiobimo/backstage'
import { Hono } from 'hono'

import { components } from '../src/blocks/component-map'
import { PREVIEW_MEDIA, PREVIEW_SAMPLES } from '../src/blocks/samples'
import { renderPreview } from './page'
import { respondWithError } from './respond'

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

export const previewRoutes = new Hono<{ Bindings: Env }>().get(
  `${BLOCK_PREVIEW.path}/:name`,
  (c) => {
    const name = c.req.param('name')
    const block = PREVIEW_SAMPLES[name] === undefined ? undefined : components.registry.get(name)
    if (!block) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
    const locale = localeOf(c.req.query(BLOCK_PREVIEW.localeParam))
    return renderPreview(
      { components, snapshot: snapshotOfSample(name, block.version, locale) },
      PREVIEW_HEADERS
    )
  }
)
