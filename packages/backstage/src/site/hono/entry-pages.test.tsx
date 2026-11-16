import { describe, expect, it } from 'vitest'

import { createSite } from './create-site.ts'
import {
  entrySnapshot,
  envWith,
  fixtureOptions,
  memoryKv,
  pageSnapshot,
  siteSnapshot
} from './site-fixture.tsx'

const ENTRIES = [
  entrySnapshot(),
  entrySnapshot({ locale: 'es', slug: 'hola', title: 'Hola', content: { title: { es: 'Hola' } } })
]

const get = async (path: string, entries = ENTRIES, pages = [pageSnapshot()]) => {
  const response = await createSite(fixtureOptions()).request(
    path,
    {},
    envWith({}, memoryKv(pages, [siteSnapshot()], {}, entries)),
    {
      waitUntil: () => undefined,
      passThroughOnException: () => undefined,
      props: {}
    } as unknown as ExecutionContext
  )
  return { response, html: await response.text() }
}

describe('entry pages', () => {
  it('renders the entry with the collection template inside the layout', async () => {
    const { response, html } = await get('/blog/hello')
    expect(response.status).toBe(200)
    expect(html).toContain('<main><article><h1>Hello</h1></article></main>')
    expect(html).toContain('<header>Studio header</header>')
  })

  it('serves the other locale from its own prefix and slug', async () => {
    const { html } = await get('/es/blog/hola')
    expect(html).toContain('<h1>Hola</h1>')
    expect(html).toContain('lang="es"')
  })

  it('titles the document from the entry label and the site name', async () => {
    const { html } = await get('/blog/hello')
    expect(html).toContain('<title>Hello | Studio</title>')
  })

  it('links the canonical url and the language alternates', async () => {
    const { html } = await get('/blog/hello')
    expect(html).toContain('<link rel="canonical" href="https://example.com/blog/hello"/>')
    expect(html).toContain(
      '<link rel="alternate" hrefLang="es" href="https://example.com/es/blog/hola"/>'
    )
    expect(html).toContain('href="/es/blog/hola"')
  })

  it('answers 404 with the page cache policy for a slug that is not published', async () => {
    const missing = await get('/blog/nope')
    const page = await get('/nope')
    expect(missing.response.status).toBe(404)
    expect(missing.response.headers.get('Cache-Control')).toBe(
      page.response.headers.get('Cache-Control')
    )
  })

  it('caches a found entry like a page', async () => {
    const entry = await get('/blog/hello')
    const page = await get('/about')
    expect(entry.response.headers.get('Cache-Control')).toBe(
      page.response.headers.get('Cache-Control')
    )
  })

  it('never serves an entry under a slug it no longer has', async () => {
    const renamed = [entrySnapshot({ slug: 'renamed' })]
    const kv = memoryKv([], [siteSnapshot()], { 'route:en:blog/hello': 'e1' }, renamed)
    const response = await createSite(fixtureOptions()).request(
      '/blog/hello',
      {},
      envWith({}, kv),
      {
        waitUntil: () => undefined,
        passThroughOnException: () => undefined,
        props: {}
      } as unknown as ExecutionContext
    )
    expect(response.status).toBe(404)
  })

  it('does not serve an entry under another collection route or a longer path', async () => {
    expect((await get('/news/hello')).response.status).toBe(404)
    expect((await get('/blog/hello/extra')).response.status).toBe(404)
  })

  it('lists published entries in the sitemap with their alternates', async () => {
    const { html } = await get('/sitemap.xml')
    expect(html).toContain('<loc>https://example.com/blog/hello</loc>')
    expect(html).toContain('<loc>https://example.com/es/blog/hola</loc>')
    expect(html).toContain('hreflang="es" href="https://example.com/es/blog/hola"')
  })
})
