import { buildRobots, buildSitemap, publishedIndexSchema, SEO } from '@studiobimo/backstage'
import { Hono } from 'hono'

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8'
const TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8'

const readPublishedPages = async (kv: KVNamespace) => {
  const parsed = publishedIndexSchema.safeParse(await kv.get(SEO.indexKey, 'json'))
  return parsed.success ? parsed.data.pages : []
}

export const seoRoutes = new Hono<{ Bindings: Env }>()
  .get(SEO.sitemapPath, async (c) =>
    c.body(buildSitemap(new URL(c.req.url).origin, await readPublishedPages(c.env.SITE!)), 200, {
      'Content-Type': XML_CONTENT_TYPE,
      'Cache-Control': SEO.cacheControl
    })
  )
  .get(SEO.robotsPath, (c) =>
    c.body(buildRobots(new URL(c.req.url).origin), 200, {
      'Content-Type': TEXT_CONTENT_TYPE,
      'Cache-Control': SEO.cacheControl
    })
  )
