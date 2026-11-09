import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import {
  clearKv,
  get,
  heroBlock,
  kv,
  platform,
  publishSnapshots,
  richParagraph,
  snapshotOf
} from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const publishAbout = (enBody = {}, esTitle = 'Acerca') =>
  publishSnapshots(
    snapshotOf({
      locale: 'en',
      slug: 'about',
      title: 'About',
      seo: { title: 'About us', description: 'Who we are', socialImageId: null },
      blocks: [heroBlock({ en: 'Hello', es: 'Hola' }, enBody)]
    }),
    snapshotOf({
      locale: 'es',
      slug: 'acerca',
      title: esTitle,
      blocks: [heroBlock({ en: 'Hello' })]
    })
  )

const html = async (path: string) => (await get(path)).text()

describe('rendering published pages', () => {
  it('serves the default locale at the root of its slug and the other under its prefix', async () => {
    await publishAbout()
    expect(await html('/about')).toContain('<h1>Hello</h1>')
    expect(await html('/es/acerca')).toContain('<html lang="es">')
    expect((await get('/acerca')).status).toBe(404)
    expect((await get('/en/about')).status).toBe(404)
    expect((await get('/es/about')).status).toBe(404)
  })

  it('serves the home page of each locale at / and /es', async () => {
    await publishSnapshots(
      snapshotOf({ locale: 'en', isHome: true, slug: null, title: 'Home' }),
      snapshotOf({ locale: 'es', isHome: true, slug: null, title: 'Inicio' })
    )
    expect(await html('/')).toContain('<title>Home</title>')
    expect(await html('/es')).toContain('<title>Inicio</title>')
    expect(await html('/es/')).toContain('<title>Inicio</title>')
  })

  it('falls back to the default locale for an empty translation', async () => {
    await publishAbout()
    expect(await html('/es/acerca')).toContain('<h1>Hello</h1>')
  })

  it('links the same page in the other locale and declares the alternates', async () => {
    await publishAbout()
    const page = await html('/about')
    expect(page).toContain('<a href="/es/acerca" hrefLang="es" lang="es">')
    expect(page).toContain('rel="alternate" hrefLang="es" href="http://localhost/es/acerca"')
    expect(page).toContain('rel="canonical" href="http://localhost/about"')
    expect(await html('/es/acerca')).toContain('href="/about"')
  })

  it('uses the SEO title and description', async () => {
    await publishAbout()
    const page = await html('/about')
    expect(page).toContain('<title>About us</title>')
    expect(page).toContain('<meta name="description" content="Who we are"/>')
  })

  it('renders rich text on the server', async () => {
    await publishAbout({ en: richParagraph('Rich words') })
    expect(await html('/about')).toContain('<p>Rich words</p>')
  })

  it('refuses an unsafe link in rich text', async () => {
    const body = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
            }
          ]
        }
      ]
    }
    await publishAbout({ en: body })
    expect(await html('/about')).not.toContain('javascript:')
  })

  it('renders images with their size and ships no script', async () => {
    await publishAbout()
    const page = await html('/about')
    expect(page).toContain('src="/media/m1.png"')
    expect(page).toContain('width="40"')
    expect(page).toContain('height="20"')
    expect(page).toContain('alt="A cat"')
    expect(page).not.toMatch(/<script|<style|\sstyle=|\son[a-z]+=/i)
  })

  it('skips a block the registry does not know', async () => {
    await publishSnapshots(
      snapshotOf({ locale: 'en', blocks: [{ ...heroBlock({ en: 'Hi' }), block: 'gone' }] }),
      snapshotOf({ locale: 'es', slug: 'acerca' })
    )
    const response = await get('/about')
    expect(response.status).toBe(200)
    expect(await response.text()).not.toContain('<h1>')
  })

  it('answers 404 for a stale route, an unpublished page and a deep path', async () => {
    await publishAbout()
    await kv.put('route:en:old', 'p1')
    expect((await get('/old')).status).toBe(404)
    expect((await get('/about/more')).status).toBe(404)
    await clearKv()
    expect((await get('/about')).status).toBe(404)
  })

  it('serves media from R2 with an immutable cache header', async () => {
    await platform.env.MEDIA!.put('media/m1.png', new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'image/png' }
    })
    const response = await get('/media/m1.png')
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect((await get('/media/missing.png')).status).toBe(404)
  })
})
