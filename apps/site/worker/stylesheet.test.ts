import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { STYLESHEET, stylesheetPathFor } from './stylesheet'
import { clearKv, get, heroBlock, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

describe('the site stylesheet', () => {
  it('is served as css and cached', async () => {
    const response = await get(STYLESHEET.path)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(STYLESHEET.contentType)
    expect(response.headers.get('Cache-Control')).toBe(STYLESHEET.cacheControl)
  })

  it('is compiled by Tailwind, not served as the raw source', async () => {
    const css = await (await get(STYLESHEET.path)).text()
    expect(css).not.toContain('@import')
    expect(css).not.toContain('@apply')
    expect(css).toMatch(/\[data-block=["']split-hero["']\]\s*\{[^}]*display:\s*grid/)
  })

  it('is cached for a year as immutable', () => {
    expect(STYLESHEET.cacheControl).toBe('public, max-age=31536000, immutable')
  })

  it('has a path that changes when its content changes', () => {
    expect(STYLESHEET.path).toMatch(/^\/site\.[0-9a-f]{12}\.css$/)
    expect(stylesheetPathFor('a{}')).toBe(stylesheetPathFor('a{}'))
    expect(stylesheetPathFor('a{}')).not.toBe(stylesheetPathFor('b{}'))
  })

  it('is no longer served at an unhashed path', async () => {
    expect((await get('/site.css')).status).toBe(404)
  })

  it('is linked from a page, whose policy allows only the site for styles', async () => {
    await publishSnapshots(
      snapshotOf({
        locale: 'en',
        isHome: true,
        slug: null,
        title: 'Home',
        blocks: [heroBlock({ en: 'Hi' })]
      })
    )
    const response = await get('/')
    const html = await response.text()
    expect(html).toContain(`<link rel="stylesheet" href="${STYLESHEET.path}"/>`)
    expect(response.headers.get('Content-Security-Policy')).toMatch(/style-src 'self'(;|$)/)
    const [, linked] = /<link rel="stylesheet" href="([^"]+)"/.exec(html) ?? []
    expect((await get(linked!)).status).toBe(200)
  })
})
