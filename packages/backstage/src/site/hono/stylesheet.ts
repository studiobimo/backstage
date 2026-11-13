import { createHash } from 'node:crypto'

import { Hono } from 'hono'

const HASH_LENGTH = 12
const ONE_YEAR_SECONDS = 31_536_000

const STYLESHEET = {
  contentType: 'text/css; charset=utf-8',
  cacheControl: `public, max-age=${ONE_YEAR_SECONDS}, immutable`
} as const

export const stylesheetPathFor = (css: string) =>
  `/site.${createHash('sha256').update(css).digest('hex').slice(0, HASH_LENGTH)}.css`

export const stylesheetRoutes = (css: string) =>
  new Hono().get(stylesheetPathFor(css), (c) =>
    c.body(css, {
      headers: { 'Content-Type': STYLESHEET.contentType, 'Cache-Control': STYLESHEET.cacheControl }
    })
  )
