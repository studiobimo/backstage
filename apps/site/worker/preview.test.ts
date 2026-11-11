import { BLOCK_PREVIEW } from '@studiobimo/backstage'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { PREVIEW_SAMPLES } from '../src/blocks/samples'
import { PREVIEW_PHOTO } from '../src/blocks/sample-support'
import { STYLESHEET } from './stylesheet'
import { clearKv, get, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const previewPath = (name: string, locale?: string) =>
  `${BLOCK_PREVIEW.path}/${name}${locale ? `?${BLOCK_PREVIEW.localeParam}=${locale}` : ''}`

const frameAncestors = (response: Response) =>
  /frame-ancestors ([^;]+)/.exec(response.headers.get('Content-Security-Policy') ?? '')?.[1]

describe('block preview route', () => {
  it('renders a block from its sample with the site stylesheet', async () => {
    const response = await get(previewPath('split-hero'))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('A headline beside the picture')
    expect(html).toContain(`<link rel="stylesheet" href="${STYLESHEET.path}"/>`)
  })

  it.each(Object.keys(PREVIEW_SAMPLES))('renders %s', async (name) => {
    expect((await get(previewPath(name))).status).toBe(200)
  })

  it('renders the requested locale and falls back to the default', async () => {
    expect(await (await get(previewPath('split-hero', 'es'))).text()).toContain(
      'Un titular junto a la imagen'
    )
    expect(await (await get(previewPath('split-hero', 'xx'))).text()).toContain(
      'A headline beside the picture'
    )
  })

  it('is noindex and never cached', async () => {
    const response = await get(previewPath('split-hero'))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(await response.text()).toContain('<meta name="robots" content="noindex, nofollow"/>')
  })

  it('answers 404 for an unknown block, uncached', async () => {
    const response = await get(previewPath('no-such-block'))
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 404 for a block that has no sample', async () => {
    expect((await get(previewPath('site-header'))).status).toBe(404)
  })

  it('may be framed by the admin origin only', async () => {
    const response = await get(previewPath('split-hero'))
    expect(frameAncestors(response)).toBe(platform.env.ADMIN_ORIGIN)
    expect(response.headers.get('X-Frame-Options')).toBeNull()
  })

  it('keeps every other route unframable', async () => {
    await publishSnapshots(snapshotOf({ locale: 'en', isHome: true, slug: null, title: 'Home' }))
    for (const path of ['/', '/nothing-here', '/health', STYLESHEET.path]) {
      const response = await get(path)
      expect(frameAncestors(response)).toBe("'none'")
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    }
  })

  it('cannot be framed by anyone when no admin origin is set', async () => {
    const env = { ...platform.env, ADMIN_ORIGIN: '' } as unknown as Env
    const response = await get(previewPath('split-hero'), undefined, env)
    expect(frameAncestors(response)).toBe("'none'")
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('serves the sample picture the blocks point at', async () => {
    const response = await get(`/${PREVIEW_PHOTO.path}`)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(await response.text()).toContain('<svg')
  })
})
