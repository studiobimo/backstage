import { describe, expect, it } from 'vitest'

import { BLOCK_PREVIEW } from '../../blocks.ts'
import { OBSERVABILITY } from '../../observability.ts'
import { SEO } from '../../seo.ts'
import { TURNSTILE } from '../turnstile.ts'
import { createSite, type CreateSiteOptions } from './create-site.ts'
import {
  envWith,
  FIXTURE,
  fixtureComponents,
  fixtureOptions,
  memoryKv,
  pageSnapshot,
  siteSnapshot
} from './site-fixture.tsx'
import { stylesheetPathFor } from './stylesheet.ts'

const publishedKv = () =>
  memoryKv(
    [
      pageSnapshot(),
      pageSnapshot({ locale: 'fr', title: 'A propos' }),
      pageSnapshot({ pageId: 'home', isHome: true, slug: null, title: 'Home' })
    ],
    [siteSnapshot()]
  )

const request = (path: string, env = envWith({}, publishedKv()), options = fixtureOptions()) =>
  createSite(options).request(path, {}, env, {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    props: {}
  } as unknown as ExecutionContext)

const directives = (response: Response) =>
  new Map(
    (response.headers.get('Content-Security-Policy') ?? '')
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources])
  )

describe('createSite pages', () => {
  it('renders a published page with SEO and the language switcher', async () => {
    const response = await request('/about')
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('<title>About | Studio</title>')
    expect(html).toContain(`<link rel="canonical" href="${FIXTURE.siteUrl}/about"/>`)
    expect(html).toContain('Hello there')
    expect(html).toContain('href="/fr/about"')
    expect(html).toContain(
      `<link rel="stylesheet" href="${stylesheetPathFor(FIXTURE.stylesheet)}"/>`
    )
  })

  it('routes the locales of the registry, not a fixed pair', async () => {
    expect((await request('/fr/about')).status).toBe(200)
    expect((await request('/es/about')).status).toBe(404)
    expect((await request('/de/about')).status).toBe(404)
  })

  it('builds the head canonical and alternates with the locales of the registry', async () => {
    const french = { locales: ['fr', 'es'], defaultLocale: 'fr' }
    const kv = memoryKv(
      [
        pageSnapshot({ locale: 'fr', title: 'A propos' }),
        pageSnapshot({ locale: 'es', title: 'Acerca' })
      ],
      [siteSnapshot()]
    )
    const options = fixtureOptions({ components: fixtureComponents(french) })
    const sitemap = await (await request(SEO.sitemapPath, envWith({}, kv), options)).text()
    const html = await (await request('/about', envWith({}, kv), options)).text()
    const listed = [...sitemap.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].slice(0, 3)
    expect(listed).toHaveLength(3)
    expect(html).toContain(`<link rel="canonical" href="${FIXTURE.siteUrl}/about"/>`)
    for (const [, hreflang, href] of listed) {
      expect(html).toContain(`<link rel="alternate" hrefLang="${hreflang}" href="${href}"/>`)
    }
    expect(listed.map(([, hreflang, href]) => `${hreflang} ${href}`)).toEqual([
      `fr ${FIXTURE.siteUrl}/about`,
      `es ${FIXTURE.siteUrl}/es/about`,
      `x-default ${FIXTURE.siteUrl}/about`
    ])
  })

  it('renders no language switcher and no alternates on a single-locale site', async () => {
    const kv = memoryKv([pageSnapshot()], [siteSnapshot()])
    const options = fixtureOptions({
      components: fixtureComponents({ locales: ['en'], defaultLocale: 'en' })
    })
    const html = await (await request('/about', envWith({}, kv), options)).text()
    expect(html).toContain(`<link rel="canonical" href="${FIXTURE.siteUrl}/about"/>`)
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('rel="alternate"')
  })

  it('renders the site snapshot into the layout slots', async () => {
    const html = await (await request('/about')).text()
    expect(html).toContain('<header>Studio header</header>')
    expect(html).toContain('<meta property="og:site_name" content="Studio"/>')
  })

  it('answers 404 for an unpublished page, cacheable', async () => {
    const response = await request('/nothing-here')
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toContain('s-maxage')
  })

  it('refuses to render without a valid SITE_URL', async () => {
    const response = await request('/about', envWith({ SITE_URL: 'not a url' }, publishedKv()))
    expect(response.status).toBe(500)
  })
})

type PageOverrides = Parameters<typeof pageSnapshot>[0]

const headOf = async (page: PageOverrides, sites = [siteSnapshot()]) => {
  const snapshot = pageSnapshot(page)
  const path = snapshot.locale === 'en' ? '/about' : `/${snapshot.locale}/about`
  return (await request(path, envWith({}, memoryKv([snapshot], sites)))).text()
}

const photo = (key: string) => ({ key, contentType: 'image/png', width: 1, height: 1, alt: '' })

const siteWithFallbacks = () =>
  siteSnapshot({
    seo: { description: 'Site words', socialImageId: 's1' },
    media: { s1: photo('media/site.png') }
  })

describe('createSite head', () => {
  it('puts the site name of the locale after the page title', async () => {
    const sites = [siteSnapshot(), siteSnapshot({ locale: 'fr', siteName: 'Atelier' })]
    expect(await headOf({}, sites)).toContain('<title>About | Studio</title>')
    expect(await headOf({ locale: 'fr', title: 'A propos' }, sites)).toContain(
      '<title>A propos | Atelier</title>'
    )
  })

  it('uses the SEO title and keeps og:title the same as the document title', async () => {
    const html = await headOf({ seo: { title: 'Custom', description: '', socialImageId: null } })
    expect(html).toContain('<title>Custom | Studio</title>')
    expect(html).toContain('<meta property="og:title" content="Custom | Studio"/>')
  })

  it('does not repeat the site name when the page title is the site name', async () => {
    expect(await headOf({ title: 'Studio' })).toContain('<title>Studio</title>')
  })

  it('falls back to the site description and social image', async () => {
    const html = await headOf({}, [siteWithFallbacks()])
    expect(html).toContain('<meta name="description" content="Site words"/>')
    expect(html).toContain(
      `<meta property="og:image" content="${FIXTURE.siteUrl}/media/site.png"/>`
    )
  })

  it('prefers the page description and social image', async () => {
    const html = await headOf(
      {
        seo: { title: '', description: 'Page words', socialImageId: 'p1' },
        media: { p1: photo('media/page.png') }
      },
      [siteWithFallbacks()]
    )
    expect(html).toContain('<meta name="description" content="Page words"/>')
    expect(html).toContain('media/page.png')
    expect(html).not.toContain('media/site.png')
    expect(html).not.toContain('Site words')
  })

  it('emits the theme color of the site settings', async () => {
    const html = await headOf({}, [siteSnapshot({ brand: { logo: null, themeColor: '#1a2b3c' } })])
    expect(html).toContain('<meta name="theme-color" content="#1a2b3c"/>')
    expect(html).toContain('<meta name="msapplication-TileColor" content="#1a2b3c"/>')
  })

  it('emits no theme color when the site has none', async () => {
    const html = await headOf({})
    expect(html).not.toContain('theme-color')
    expect(html).not.toContain('msapplication-TileColor')
  })

  it('renders a page of a site that was never published as it is', async () => {
    const html = await headOf({}, [])
    expect(html).toContain('<title>About</title>')
    expect(html).not.toContain('og:site_name')
    expect(html).not.toContain('name="description"')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('theme-color')
  })
})

describe('createSite security and preview', () => {
  it('sends a strict policy that a site may only add sources to', async () => {
    const strict = directives(await request('/about'))
    expect(strict.get('default-src')).toEqual(["'none'"])
    expect(strict.get('frame-ancestors')).toEqual(["'none'"])
    expect(strict.has('script-src')).toBe(false)
    const extended = directives(
      await request(
        '/about',
        envWith({}, publishedKv()),
        fixtureOptions({
          contentSecurityPolicy: { imgSrc: ['https://img.example.com'], scriptSrc: ["'self'"] }
        })
      )
    )
    expect(extended.get('img-src')).toEqual(["'self'", 'https://img.example.com'])
    expect(extended.get('script-src')).toEqual(["'self'"])
    expect(extended.get('frame-ancestors')).toEqual(["'none'"])
  })

  it('lets a site load turnstile through script-src and frame-src only when asked', async () => {
    const withTurnstile = directives(
      await request(
        '/about',
        envWith({}, publishedKv()),
        fixtureOptions({
          turnstile: true,
          contentSecurityPolicy: { scriptSrc: ["'self'"] }
        })
      )
    )
    expect(withTurnstile.get('script-src')).toEqual(["'self'", TURNSTILE.origin])
    expect(withTurnstile.get('frame-src')).toEqual([TURNSTILE.origin])
    const without = directives(await request('/about'))
    expect(without.has('frame-src')).toBe(false)
    expect(without.has('script-src')).toBe(false)
    const base = directives(
      await request('/about', envWith({}, publishedKv()), fixtureOptions({ turnstile: true }))
    )
    for (const name of ['default-src', 'connect-src', 'form-action', 'frame-ancestors']) {
      expect(base.get(name)).toEqual(without.get(name))
    }
  })

  it('lets only the admin origin frame the block preview', async () => {
    const preview = await request(`${BLOCK_PREVIEW.path}/note`)
    expect(directives(preview).get('frame-ancestors')).toEqual([FIXTURE.adminOrigin])
    expect(preview.headers.get('X-Frame-Options')).toBeNull()
    expect((await request('/about')).headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('renders the block preview from its sample, noindex and uncached', async () => {
    const response = await request(`${BLOCK_PREVIEW.path}/note`)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).toContain('Sample note')
    expect((await request(`${BLOCK_PREVIEW.path}/header`)).status).toBe(404)
  })

  it('serves a thumbnail cross-origin and an unknown one as 404', async () => {
    const path = `${BLOCK_PREVIEW.path}/note/${BLOCK_PREVIEW.thumbnailFile}`
    const response = await request(path)
    expect(await response.text()).toBe(FIXTURE.thumbnail)
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin')
    for (const name of ['x', 'constructor']) {
      const unknown = await request(`${BLOCK_PREVIEW.path}/${name}/${BLOCK_PREVIEW.thumbnailFile}`)
      expect(unknown.status).toBe(404)
    }
  })

  it('has no preview routes unless the site supplies samples', async () => {
    const response = await request(
      `${BLOCK_PREVIEW.path}/note`,
      envWith({}, publishedKv()),
      fixtureOptions({ preview: undefined })
    )
    expect(response.status).toBe(404)
  })
})

describe('createSite turnstile frame-src', () => {
  it('keeps a consumer frame-src next to turnstile, without listing an origin twice', async () => {
    const embed = 'https://www.youtube-nocookie.com'
    const merged = directives(
      await request(
        '/about',
        envWith({}, publishedKv()),
        fixtureOptions({ turnstile: true, contentSecurityPolicy: { frameSrc: [embed] } })
      )
    )
    expect(merged.get('frame-src')).toEqual([embed, TURNSTILE.origin])
    const listed = directives(
      await request(
        '/about',
        envWith({}, publishedKv()),
        fixtureOptions({
          turnstile: true,
          contentSecurityPolicy: {
            frameSrc: [embed, TURNSTILE.origin],
            scriptSrc: [TURNSTILE.origin]
          }
        })
      )
    )
    expect(listed.get('frame-src')).toEqual([embed, TURNSTILE.origin])
    expect(listed.get('script-src')).toEqual([TURNSTILE.origin])
  })
})

describe('createSite routes', () => {
  it('serves the stylesheet immutably under its hashed path', async () => {
    const response = await request(stylesheetPathFor(FIXTURE.stylesheet))
    expect(await response.text()).toBe(FIXTURE.stylesheet)
    expect(response.headers.get('Cache-Control')).toContain('immutable')
  })

  it('serves media from the bucket', async () => {
    const bucket = {
      get: async (key: string) =>
        key === FIXTURE.mediaKey
          ? { body: new Response('png').body!, httpMetadata: { contentType: 'image/png' } }
          : null
    }
    const env = envWith({ MEDIA: bucket }, publishedKv())
    const found = await request(`/${FIXTURE.mediaKey}`, env)
    expect(found.headers.get('Content-Type')).toBe('image/png')
    expect((await request('/media/missing.png', env)).status).toBe(404)
  })

  it('serves the sitemap and robots at the configured origin', async () => {
    const env = envWith({ SITE_URL: 'https://canonical.example' }, publishedKv())
    expect(await (await request(SEO.robotsPath, env)).text()).toContain(
      'https://canonical.example/sitemap.xml'
    )
    expect((await request(SEO.sitemapPath, env)).headers.get('Content-Type')).toContain('xml')
  })

  it('answers the health check', async () => {
    expect(await (await request(OBSERVABILITY.health.path)).json()).toEqual(
      OBSERVABILITY.health.body
    )
  })

  it('lets a site add routes and head elements', async () => {
    const options = fixtureOptions({
      head: (snapshot) => <meta name="x-page" content={snapshot.slug ?? ''} />,
      routes: (app) => void app.get('/ping', (c) => c.text('pong'))
    })
    expect(await (await request('/ping', undefined, options)).text()).toBe('pong')
    expect(await (await request('/about', undefined, options)).text()).toContain(
      '<meta name="x-page" content="about"/>'
    )
  })
})

describe('createSite favicon', () => {
  const withFavicon = async (favicon: CreateSiteOptions['favicon']) =>
    (await request('/about', envWith({}, publishedKv()), { ...fixtureOptions(), favicon })).text()

  it('links no icon when none is given', async () => {
    expect(await headOf({})).not.toContain('rel="icon"')
  })

  it('links a favicon given as a url', async () => {
    expect(await withFavicon('/favicon.svg')).toContain('<link rel="icon" href="/favicon.svg"/>')
  })

  it('links a favicon with its type', async () => {
    const html = await withFavicon({ href: '/favicon.svg', type: 'image/svg+xml' })
    expect(html).toContain('rel="icon"')
    expect(html).toContain('href="/favicon.svg"')
    expect(html).toContain('type="image/svg+xml"')
  })

  it('keeps the head option next to the favicon', async () => {
    const options = {
      ...fixtureOptions(),
      favicon: '/favicon.svg',
      head: () => <script src="/assets/app.js" defer />
    }
    const html = await (await request('/about', envWith({}, publishedKv()), options)).text()
    expect(html).toContain('rel="icon"')
    expect(html).toContain('<script src="/assets/app.js" defer=""></script>')
  })

  it('allows a same-origin script only when script-src names self', async () => {
    const allowed = await request('/about', envWith({}, publishedKv()), {
      ...fixtureOptions(),
      contentSecurityPolicy: { scriptSrc: ["'self'"] }
    })
    expect(directives(allowed).get('script-src')).toEqual(["'self'"])
    expect(directives(await request('/about')).has('script-src')).toBe(false)
  })
})
