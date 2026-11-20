import { publishedIndexSchema, SEO, TURNSTILE } from '@studiobimo/backstage/site'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { RESERVE } from '../src/reserve/reserve'
import {
  clearKv,
  directives,
  get,
  heroBlock,
  platform,
  publishSnapshots,
  snapshotOf
} from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const publishHome = () =>
  publishSnapshots(
    snapshotOf({
      locale: 'en',
      isHome: true,
      slug: null,
      title: 'Home',
      blocks: [heroBlock({ en: 'Hi' })]
    }),
    snapshotOf({
      locale: 'es',
      isHome: true,
      slug: null,
      title: 'Inicio',
      blocks: [heroBlock({ es: 'Hola' })]
    })
  )

describe('site worker', () => {
  it('sends a strict policy on a page and on a 404', async () => {
    await publishHome()
    for (const path of ['/', '/nothing-here']) {
      const policy = directives(await get(path))
      expect(policy.get('default-src')).toEqual(["'none'"])
      expect(policy.get('script-src')).toEqual([
        ...RESERVE.contentSecurityPolicy.scriptSrc,
        TURNSTILE.origin
      ])
      expect(policy.get('frame-src')).toEqual([TURNSTILE.origin])
      expect(policy.get('base-uri')).toEqual(["'none'"])
      expect(policy.get('frame-ancestors')).toEqual(["'none'"])
      for (const sources of policy.values()) {
        expect(sources).not.toContain("'unsafe-inline'")
        expect(sources).not.toContain("'unsafe-eval'")
        expect(sources).not.toContain('*')
      }
    }
  })

  it('sends the other security headers', async () => {
    const { headers } = await get('/')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('X-Frame-Options')).toBe('DENY')
    expect(headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(headers.get('Strict-Transport-Security')).toMatch(/max-age=\d+/)
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(headers.get('Permissions-Policy')).toContain('camera=()')
  })

  it('answers /health', async () => {
    const response = await get('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  describe('search engine files', () => {
    const OTHER_HOST = 'https://other.example.net'
    const HOST = platform.env.SITE_URL

    it('serves a robots.txt that names the sitemap', async () => {
      const response = await get(`${OTHER_HOST}/robots.txt`)
      expect(response.headers.get('Content-Type')).toMatch(/^text\/plain/)
      expect(await response.text()).toContain(`Sitemap: ${HOST}/sitemap.xml`)
    })

    it('serves an empty sitemap before anything is published', async () => {
      const response = await get('/sitemap.xml')
      expect(response.headers.get('Content-Type')).toMatch(/^application\/xml/)
      expect(await response.text()).not.toContain('<url>')
    })

    it('lists the published pages with hreflang alternates', async () => {
      const index = publishedIndexSchema.parse({
        format: SEO.format,
        pages: [
          { pageId: 'p1', isHome: false, slugs: { en: 'about', es: 'nosotros' }, publishedAt: 0 }
        ]
      })
      await platform.env.SITE!.put(SEO.indexKey, JSON.stringify(index))
      const xml = await (await get(`${OTHER_HOST}/sitemap.xml`)).text()
      expect(xml).toContain(`<loc>${HOST}/about</loc>`)
      expect(xml).toContain(`hreflang="es" href="${HOST}/es/nosotros"`)
      expect(xml).toContain(`hreflang="x-default" href="${HOST}/about"`)
      expect(xml).not.toContain(OTHER_HOST)
    })

    it('fails clearly when SITE_URL is not configured', async () => {
      const env = { ...platform.env, SITE_URL: '' } as unknown as Env
      expect((await get('/sitemap.xml', undefined, env)).status).toBe(500)
      expect((await get('/robots.txt', undefined, env)).status).toBe(500)
    })
  })
})
