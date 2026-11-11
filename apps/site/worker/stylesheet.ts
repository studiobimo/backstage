import { createHash } from 'node:crypto'

import { Hono } from 'hono'

import stylesheet from '../src/site.css?inline'

const HASH_LENGTH = 12
const ONE_YEAR_SECONDS = 31_536_000

export const stylesheetPathFor = (css: string) =>
  `/site.${createHash('sha256').update(css).digest('hex').slice(0, HASH_LENGTH)}.css`

export const STYLESHEET = {
  path: stylesheetPathFor(stylesheet),
  contentType: 'text/css; charset=utf-8',
  cacheControl: `public, max-age=${ONE_YEAR_SECONDS}, immutable`
} as const

export const stylesheetRoutes = new Hono().get(STYLESHEET.path, (c) =>
  c.body(stylesheet, {
    headers: {
      'Content-Type': STYLESHEET.contentType,
      'Cache-Control': STYLESHEET.cacheControl
    }
  })
)
