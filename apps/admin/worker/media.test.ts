import { MEDIA } from '@studiobimo/backstage'
import { afterAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, db, env } = await openTestEnv()
afterAll(dispose)

const SAME_ORIGIN = 'http://localhost'
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const GIF = [...'GIF89a'].map((char) => char.charCodeAt(0))

const IHDR = [0, 0, 0, 13, ...'IHDR'].map((value) =>
  typeof value === 'string' ? value.charCodeAt(0) : value
)
const dimensionBytes = (value: number) => [0, 0, value >> 8, value & 0xff]

const pngBytes = (length = 64, width = 800, height = 600) =>
  new Uint8Array([
    ...PNG,
    ...IHDR,
    ...dimensionBytes(width),
    ...dimensionBytes(height),
    ...new Array(length - PNG.length - IHDR.length - 8).fill(1)
  ])

const described = {
  decorative: false,
  alt: { en: 'A chair', es: 'Una silla' }
}

const form = (file: Uint8Array | null, metadata: unknown = described, name = 'chair.png') => {
  const body = new FormData()
  if (file) body.set(MEDIA.upload.fileField, new File([file], name, { type: 'image/png' }))
  if (metadata !== null) body.set(MEDIA.upload.metadataField, JSON.stringify(metadata))
  return body
}

const encoded = async (body: FormData) => {
  const probe = new Request('http://localhost/', { method: 'POST', body })
  const bytes = await probe.arrayBuffer()
  const contentType = probe.headers.get('content-type')!
  return { bytes, contentType, contentLength: String(bytes.byteLength) }
}

const upload = async (
  body: FormData,
  bindings = env.localDevelopment,
  headers: (encoded: { contentLength: string }) => Record<string, string> = ({
    contentLength
  }) => ({
    'content-length': contentLength
  })
) => {
  const { bytes, contentType, contentLength } = await encoded(body)
  return app.request(
    '/api/v1/media',
    {
      method: 'POST',
      body: bytes,
      headers: {
        'content-type': contentType,
        origin: SAME_ORIGIN,
        ...headers({ contentLength })
      }
    },
    bindings
  )
}

const rows = async () => (await db.prepare('SELECT * FROM media').all()).results

describe('media upload API', () => {
  it('stores the image in R2 under an immutable key and records it', async () => {
    const response = await upload(form(pngBytes()))
    expect(response.status).toBe(201)
    const { media } = (await response.json()) as { media: { id: string } }
    expect(media).toMatchObject({
      filename: 'chair.png',
      contentType: 'image/png',
      size: 64,
      width: 800,
      height: 600,
      decorative: false,
      alt: { en: 'A chair', es: 'Una silla' }
    })

    const stored = await env.localDevelopment.MEDIA!.get(`media/${media.id}.png`)
    expect(stored?.httpMetadata).toMatchObject({
      contentType: 'image/png',
      cacheControl: MEDIA.cacheControl
    })
    expect(await rows()).toContainEqual(
      expect.objectContaining({ id: media.id, r2_key: `media/${media.id}.png` })
    )
  })

  it('lists the uploaded images and serves their bytes', async () => {
    const { media } = (await (await upload(form(pngBytes()))).json()) as { media: { id: string } }
    const listed = await app.request('/api/v1/media', {}, env.localDevelopment)
    expect(listed.status).toBe(200)
    expect(((await listed.json()) as { media: { id: string }[] }).media).toContainEqual(
      expect.objectContaining({ id: media.id, filename: 'chair.png' })
    )
    const file = await app.request(`/api/v1/media/${media.id}/file`, {}, env.localDevelopment)
    expect(file.status).toBe(200)
    expect(file.headers.get('content-type')).toBe('image/png')
    expect((await file.arrayBuffer()).byteLength).toBe(64)
    const missing = await app.request('/api/v1/media/nope/file', {}, env.localDevelopment)
    expect(missing.status).toBe(404)
  })

  it('accepts a decorative image without alt text and drops any alt it carries', async () => {
    const response = await upload(
      form(pngBytes(), { ...described, decorative: true, alt: { en: 'ignored', es: '' } })
    )
    expect(response.status).toBe(201)
    const { media } = (await response.json()) as { media: { decorative: boolean; alt: object } }
    expect(media).toMatchObject({ decorative: true, alt: {} })
  })
})

describe('media upload API refusals', () => {
  it('trusts the bytes, not the declared type or the file name', async () => {
    const response = await upload(form(new Uint8Array([...GIF, 0, 0, 0]), described, 'chair.png'))
    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: 'unsupported_media' })
  })

  it('refuses an image over the size cap', async () => {
    const response = await upload(form(pngBytes(MEDIA.maxBytes + 1)))
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'too_large' })
  })

  it('refuses missing alt text for a locale', async () => {
    const response = await upload(
      form(pngBytes(), { ...described, alt: { en: 'A chair', es: '' } })
    )
    expect(response.status).toBe(400)
  })

  it.each([
    ['no file', form(null)],
    ['no metadata', form(pngBytes(), null)],
    ['an empty file', form(new Uint8Array())],
    [
      'metadata that is not JSON',
      (() => {
        const body = form(pngBytes())
        body.set(MEDIA.upload.metadataField, 'nope')
        return body
      })()
    ]
  ])('refuses %s', async (_name, body) => {
    const before = (await rows()).length
    expect((await upload(body)).status).toBe(400)
    expect(await rows()).toHaveLength(before)
  })

  it('records the size read from the file and ignores what the client claims', async () => {
    const claimed = { ...described, width: 1, height: 1 }
    const response = await upload(form(pngBytes(64, 321, 123), claimed))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ media: { width: 321, height: 123 } })
  })

  it.each([
    ['dimensions that cannot be read', new Uint8Array([...PNG, 1, 2, 3, 4])],
    ['dimensions beyond the cap', pngBytes(64, MEDIA.maxDimension + 1, 10)],
    ['a zero dimension', pngBytes(64, 0, 10)]
  ])('refuses an image with %s', async (_name, bytes) => {
    const before = (await rows()).length
    const response = await upload(form(bytes))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid' })
    expect(await rows()).toHaveLength(before)
  })

  it('refuses an upload that does not declare its length', async () => {
    const before = (await rows()).length
    const response = await upload(form(pngBytes()), env.localDevelopment, () => ({}))
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'too_large' })
    expect(await rows()).toHaveLength(before)
  })

  it('refuses an upload whose declared length is not a number', async () => {
    const response = await upload(form(pngBytes()), env.localDevelopment, () => ({
      'content-length': 'many'
    }))
    expect(response.status).toBe(413)
  })

  it('refuses a deployed request without Access', async () => {
    expect((await upload(form(pngBytes()), env.deployed)).status).toBe(403)
  })
})
