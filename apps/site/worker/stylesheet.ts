import { Hono } from 'hono'

import stylesheet from '../src/site.css?inline'

export const STYLESHEET = {
  path: '/site.css',
  contentType: 'text/css; charset=utf-8',
  cacheControl: 'public, max-age=3600'
} as const

export const stylesheetRoutes = new Hono().get(STYLESHEET.path, (c) =>
  c.body(stylesheet, {
    headers: {
      'Content-Type': STYLESHEET.contentType,
      'Cache-Control': STYLESHEET.cacheControl
    }
  })
)
