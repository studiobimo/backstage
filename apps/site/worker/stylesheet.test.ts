import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import {
  clearKv,
  get,
  heroBlock,
  platform,
  publishSnapshots,
  snapshotOf,
  stylesheetPath
} from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

describe('the site stylesheet', () => {
  it('is compiled by Tailwind, not served as the raw source', async () => {
    const css = await (await get(await stylesheetPath())).text()
    expect(css).not.toContain('@import')
    expect(css).not.toContain('@apply')
    expect(css).toMatch(/\[data-block=["']split-hero["']\]\s*\{[^}]*display:\s*grid/)
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
    expect(html).toContain(`<link rel="stylesheet" href="${await stylesheetPath()}"/>`)
    expect(response.headers.get('Content-Security-Policy')).toMatch(/style-src 'self'(;|$)/)
  })
})
