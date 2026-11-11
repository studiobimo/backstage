import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { STYLESHEET } from './stylesheet'
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
    expect(await response.text()).toContain(`<link rel="stylesheet" href="${STYLESHEET.path}"/>`)
    expect(response.headers.get('Content-Security-Policy')).toMatch(/style-src 'self'(;|$)/)
  })
})
