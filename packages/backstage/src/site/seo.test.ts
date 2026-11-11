import { describe, expect, it } from 'vitest'

import { SEO } from '../seo.ts'
import { respondWithRobots, respondWithSitemap } from './seo.ts'
import type { KvReader } from './store.ts'

const HOST = 'https://example.com'

const kvWith = (value: unknown): KvReader => ({
  get: (async (_key: string, options?: { type: 'json' }) =>
    options ? value : null) as KvReader['get']
})

const index = {
  format: SEO.format,
  pages: [{ pageId: 'p1', isHome: false, slugs: { en: 'about', es: 'nosotros' }, publishedAt: 0 }]
}

describe('search engine responses', () => {
  it('names the sitemap in robots.txt', async () => {
    const response = respondWithRobots(new Request(`${HOST}/robots.txt`))
    expect(response.headers.get('Content-Type')).toMatch(/^text\/plain/)
    expect(response.headers.get('Cache-Control')).toBe(SEO.cacheControl)
    expect(await response.text()).toContain(`Sitemap: ${HOST}/sitemap.xml`)
  })

  it('lists published pages with hreflang alternates', async () => {
    const response = await respondWithSitemap(kvWith(index), new Request(`${HOST}/sitemap.xml`))
    const xml = await response.text()
    expect(response.headers.get('Content-Type')).toMatch(/^application\/xml/)
    expect(xml).toContain(`<loc>${HOST}/about</loc>`)
    expect(xml).toContain(`hreflang="es" href="${HOST}/es/nosotros"`)
  })

  it.each([null, { format: 99, pages: [] }])(
    'is empty for an unreadable index: %j',
    async (value) => {
      const xml = await (await respondWithSitemap(kvWith(value), new Request(`${HOST}/s`))).text()
      expect(xml).not.toContain('<url>')
    }
  )
})
