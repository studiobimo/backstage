import { describe, expect, it } from 'vitest'

import { MEDIA } from '../media.ts'
import { respondWithMedia, type MediaReader } from './media.ts'

const bucketOf = (contentType?: string): MediaReader => ({
  get: async (key) =>
    key === 'media/m1.png'
      ? { body: new Blob([new Uint8Array([1, 2, 3])]).stream(), httpMetadata: { contentType } }
      : null
})

const ask = (bucket: MediaReader, path: string) =>
  respondWithMedia(bucket, new Request(`https://example.com${path}`))

describe('respondWithMedia', () => {
  it('serves the object with its type and an immutable cache header', async () => {
    const response = await ask(bucketOf('image/png'), '/media/m1.png')
    expect(response?.headers.get('Content-Type')).toBe('image/png')
    expect(response?.headers.get('Cache-Control')).toBe(MEDIA.cacheControl)
    expect(new Uint8Array((await response?.arrayBuffer()) ?? new ArrayBuffer(0))).toEqual(
      new Uint8Array([1, 2, 3])
    )
  })

  it('falls back to a binary type when the object has none', async () => {
    const response = await ask(bucketOf(), '/media/m1.png')
    expect(response?.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  it('is null for a missing object', async () => {
    expect(await ask(bucketOf('image/png'), '/media/missing.png')).toBeNull()
  })
})
