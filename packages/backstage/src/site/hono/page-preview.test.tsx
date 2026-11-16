import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generatePreviewToken,
  PAGE_PREVIEW,
  pagePreviewOf,
  previewKey
} from '../../page-preview.ts'
import { SEO } from '../../seo.ts'
import { createSite } from './create-site.ts'
import { envWith, fixtureOptions, memoryKv, pageSnapshot, siteSnapshot } from './site-fixture.tsx'

const NOW = Date.now()
const ONE_HOUR_MS = 3_600_000

const draftBlock = {
  id: 'b1',
  block: 'note',
  schemaVersion: 1,
  content: { text: 'Draft words' }
}

const draftSnapshots = () => [
  pageSnapshot({ title: 'Draft title', blocks: [draftBlock], publishedAt: NOW }),
  pageSnapshot({ locale: 'fr', title: 'Brouillon', publishedAt: NOW })
]

const withPreview = (token: string, expiresAt = NOW + ONE_HOUR_MS) =>
  envWith(
    {},
    memoryKv([], [siteSnapshot()], {
      [previewKey(token)]: JSON.stringify({ ...pagePreviewOf(draftSnapshots(), NOW), expiresAt })
    })
  )

const get = (path: string, env = envWith()) =>
  createSite(fixtureOptions()).request(path, {}, env, {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    props: {}
  } as unknown as ExecutionContext)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSite page preview', () => {
  it('renders the draft with the real layout, slots and site name', async () => {
    const token = generatePreviewToken()
    const response = await get(`${PAGE_PREVIEW.path}/${token}`, withPreview(token))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('Draft words')
    expect(html).toContain('Studio header')
    expect(html).toContain('<title>Draft title | Studio</title>')
  })

  it('picks the locale from the query and links the languages inside the preview', async () => {
    const token = generatePreviewToken()
    const html = await (
      await get(`${PAGE_PREVIEW.path}/${token}?locale=fr`, withPreview(token))
    ).text()
    expect(html).toContain('Brouillon')
    expect(html).toContain(`href="${PAGE_PREVIEW.path}/${token}?locale=en"`)
  })

  it('is never cached and marked noindex in the header and the head', async () => {
    const token = generatePreviewToken()
    const response = await get(`${PAGE_PREVIEW.path}/${token}`, withPreview(token))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    const html = await response.text()
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('rel="alternate"')
  })

  it('keeps the content security policy and refuses framing', async () => {
    const token = generatePreviewToken()
    const response = await get(`${PAGE_PREVIEW.path}/${token}`, withPreview(token))
    const policy = response.headers.get('Content-Security-Policy') ?? ''
    expect(policy).toContain("default-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
  })

  it('bypasses the edge cache both ways', async () => {
    const cache = { match: vi.fn(async () => undefined), put: vi.fn(async () => undefined) }
    vi.stubGlobal('caches', { default: cache })
    const token = generatePreviewToken()
    await get(`${PAGE_PREVIEW.path}/${token}`, withPreview(token))
    await get(`${PAGE_PREVIEW.path}/${generatePreviewToken()}`)
    expect(cache.match).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('answers 404 without caching for an unknown token', async () => {
    const response = await get(`${PAGE_PREVIEW.path}/${generatePreviewToken()}`)
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 404 for a token that is not well formed', async () => {
    expect((await get(`${PAGE_PREVIEW.path}/short`)).status).toBe(404)
  })

  it('answers 404 once the stored preview has expired, even if KV still holds it', async () => {
    const token = generatePreviewToken()
    const response = await get(`${PAGE_PREVIEW.path}/${token}`, withPreview(token, NOW - 1))
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('Draft words')
  })

  it('is kept out of search by robots.txt', async () => {
    const robots = await (await get(SEO.robotsPath)).text()
    expect(robots).toContain('Disallow: /__preview/')
  })
})
