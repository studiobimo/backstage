import { MEDIA } from '@studiobimo/backstage'
import { describe, expect, it, vi } from 'vitest'

import {
  fitWithin,
  IMAGE_REJECTION,
  ImageRejected,
  outputTypeFor,
  processImage,
  renamedFor,
  type ImageCodec
} from './process-image'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff, 0xe0]

const fileOf = (head: number[], name: string, type = 'image/png') =>
  new File([new Uint8Array([...head, 0, 0, 0, 0])], name, { type })

const codecFor = (
  size: { width: number; height: number },
  encodedType = 'image/png',
  bytes = 10
) => {
  const close = vi.fn()
  const encode = vi.fn<ImageCodec['encode']>(
    async () => new Blob([new Uint8Array(bytes)], { type: encodedType })
  )
  const codec: ImageCodec = { decode: async () => ({ ...size, close }), encode }
  return { codec, close, encode }
}

const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => (error instanceof ImageRejected ? error.reason : error)
  )

describe('fitWithin', () => {
  it('keeps an image that already fits', () => {
    expect(fitWithin({ width: 800, height: 600 }, 2400)).toEqual({ width: 800, height: 600 })
  })

  it('scales the longest side down to the cap and keeps the ratio', () => {
    expect(fitWithin({ width: 4800, height: 3200 }, 2400)).toEqual({ width: 2400, height: 1600 })
    expect(fitWithin({ width: 3000, height: 6000 }, 2400)).toEqual({ width: 1200, height: 2400 })
  })
})

describe('output naming', () => {
  it('re-encodes AVIF as WebP because browsers cannot encode AVIF', () => {
    expect(outputTypeFor('image/avif')).toBe('image/webp')
    expect(outputTypeFor('image/png')).toBe('image/png')
  })

  it('gives the file the extension of what it now holds', () => {
    expect(renamedFor('holiday.IMG.heic.jpeg', 'image/jpeg')).toBe('holiday.IMG.heic.jpg')
    expect(renamedFor('.png', 'image/webp')).toBe('image.webp')
  })
})

describe('processImage', () => {
  it('re-encodes from decoded pixels so no metadata is carried over', async () => {
    const { codec, close, encode } = codecFor({ width: 4800, height: 3200 }, 'image/jpeg')
    const result = await processImage(fileOf(JPEG, 'photo.jpeg', 'image/jpeg'), codec)
    expect(encode).toHaveBeenCalledWith(
      expect.anything(),
      { width: 2400, height: 1600 },
      'image/jpeg',
      0.85
    )
    expect(result).toMatchObject({ width: 2400, height: 1600, contentType: 'image/jpeg' })
    expect(result.file.name).toBe('photo.jpg')
    expect(close).toHaveBeenCalledOnce()
  })

  it('checks the magic bytes, not the name or the declared type', async () => {
    const { codec } = codecFor({ width: 10, height: 10 })
    const gif = fileOf(
      [...'GIF89a'].map((char) => char.charCodeAt(0)),
      'photo.png'
    )
    expect(await rejection(processImage(gif, codec))).toBe(IMAGE_REJECTION.unsupported)
  })

  it('refuses a source file that is too large before decoding it', async () => {
    const { codec } = codecFor({ width: 10, height: 10 })
    const big = fileOf(PNG, 'big.png')
    Object.defineProperty(big, 'size', { value: MEDIA.maxSourceBytes + 1 })
    expect(await rejection(processImage(big, codec))).toBe(IMAGE_REJECTION.tooLarge)
  })

  it('lowers the quality step by step until a lossy image fits the cap', async () => {
    const { codec, encode } = codecFor({ width: 10, height: 10 }, 'image/jpeg')
    const over = new Blob([new Uint8Array(MEDIA.maxBytes + 1)], { type: 'image/jpeg' })
    const fits = new Blob([new Uint8Array(10)], { type: 'image/jpeg' })
    encode.mockResolvedValueOnce(over).mockResolvedValueOnce(over).mockResolvedValueOnce(fits)
    const result = await processImage(fileOf(JPEG, 'a.jpg', 'image/jpeg'), codec)
    expect(encode.mock.calls.map((call) => call[3])).toEqual([0.85, 0.7, 0.55])
    expect(result.file.size).toBe(10)
  })

  it('gives up after the lowest quality and refuses the image', async () => {
    const { codec, encode } = codecFor({ width: 10, height: 10 }, 'image/jpeg', MEDIA.maxBytes + 1)
    const file = fileOf(JPEG, 'a.jpg', 'image/jpeg')
    expect(await rejection(processImage(file, codec))).toBe(IMAGE_REJECTION.tooLarge)
    expect(encode.mock.calls.map((call) => call[3])).toEqual([0.85, 0.7, 0.55, 0.4])
  })

  it('does not retry a PNG at lower quality, which would change nothing', async () => {
    const { codec, encode } = codecFor({ width: 10, height: 10 }, 'image/png', MEDIA.maxBytes + 1)
    expect(await rejection(processImage(fileOf(PNG, 'a.png'), codec))).toBe(
      IMAGE_REJECTION.tooLarge
    )
    expect(encode).toHaveBeenCalledOnce()
  })

  it('refuses an image that is still over the cap once re-encoded', async () => {
    const { codec } = codecFor({ width: 10, height: 10 }, 'image/png', MEDIA.maxBytes + 1)
    expect(await rejection(processImage(fileOf(PNG, 'a.png'), codec))).toBe(
      IMAGE_REJECTION.tooLarge
    )
  })

  it('refuses an image the browser cannot decode', async () => {
    const codec: ImageCodec = {
      decode: async () => {
        throw new Error('corrupt')
      },
      encode: async () => new Blob()
    }
    expect(await rejection(processImage(fileOf(PNG, 'a.png'), codec))).toBe(
      IMAGE_REJECTION.unreadable
    )
  })

  it('refuses an encoder that fell back to a type the server does not accept', async () => {
    const { codec, close } = codecFor({ width: 10, height: 10 }, 'image/bmp')
    expect(await rejection(processImage(fileOf(PNG, 'a.png'), codec))).toBe(
      IMAGE_REJECTION.unsupported
    )
    expect(close).toHaveBeenCalledOnce()
  })
})
