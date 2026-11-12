import { describe, expect, it } from 'vitest'

import { readImageSize } from './image-size.ts'
import { MEDIA } from './media.ts'

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))
const be16 = (value: number) => [value >> 8, value & 0xff]
const be32 = (value: number) => [...be16(value >>> 16), ...be16(value & 0xffff)]
const le16 = (value: number) => [value & 0xff, value >> 8]
const le24 = (value: number) => [value & 0xff, (value >> 8) & 0xff, value >> 16]
const box = (name: string, payload: number[]) => [
  ...be32(payload.length + 8),
  ...ascii(name),
  ...payload
]
const bytesOf = (values: number[]) => new Uint8Array(values)

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const IHDR_REST = [8, 6, 0, 0, 0]
const SEGMENT_PADDING = 7
const LARGE_SEGMENT_BYTES = 40000

const png = (width: number, height: number) =>
  bytesOf([
    ...PNG_SIGNATURE,
    ...be32(13),
    ...ascii('IHDR'),
    ...be32(width),
    ...be32(height),
    ...IHDR_REST
  ])

const jpegFrame = (width: number, height: number) => [
  0xff,
  0xc0,
  ...be16(17),
  8,
  ...be16(height),
  ...be16(width),
  3,
  1,
  0x22,
  0,
  2,
  0x11,
  1,
  3,
  0x11,
  1
]

const jpeg = (width: number, height: number, leading: number[] = []) =>
  bytesOf([0xff, 0xd8, ...leading, ...jpegFrame(width, height)])

const appSegment = (length: number) => [
  0xff,
  0xe1,
  ...be16(length + 2),
  ...new Array(length).fill(SEGMENT_PADDING)
]

const riff = (chunk: string, payload: number[]) =>
  bytesOf([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'), ...ascii(chunk), ...payload])

const webpLossy = (width: number, height: number) =>
  riff('VP8 ', [0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height)])

const webpLossless = (width: number, height: number) => {
  const packed = (width - 1) | ((height - 1) << 14)
  const packedBytes = [
    packed & 0xff,
    (packed >> 8) & 0xff,
    (packed >> 16) & 0xff,
    (packed >>> 24) & 0xff
  ]
  return riff('VP8L', [0, 0, 0, 0, 0x2f, ...packedBytes])
}

const webpExtended = (width: number, height: number) =>
  riff('VP8X', [0, 0, 0, 0, 0, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)])

const ispe = (width: number, height: number) =>
  box('ispe', [0, 0, 0, 0, ...be32(width), ...be32(height)])

const avif = (...sizes: [number, number][]) =>
  bytesOf([
    ...box('ftyp', [...ascii('avif'), 0, 0, 0, 0, ...ascii('avif')]),
    ...box('meta', [
      0,
      0,
      0,
      0,
      ...box('hdlr', new Array(24).fill(0)),
      ...box(
        'iprp',
        box(
          'ipco',
          sizes.flatMap(([width, height]) => ispe(width, height))
        )
      )
    ]),
    ...box('mdat', [1, 2, 3])
  ])

describe('readImageSize', () => {
  it('reads a PNG from its header', () => {
    expect(readImageSize(png(800, 600), 'image/png')).toEqual({ width: 800, height: 600 })
  })

  it('reads a JPEG frame header', () => {
    expect(readImageSize(jpeg(1200, 900), 'image/jpeg')).toEqual({ width: 1200, height: 900 })
  })

  it('reads a JPEG whose frame header comes after large metadata segments', () => {
    const leading = [...appSegment(LARGE_SEGMENT_BYTES), ...appSegment(LARGE_SEGMENT_BYTES)]
    expect(readImageSize(jpeg(640, 480, leading), 'image/jpeg')).toEqual({
      width: 640,
      height: 480
    })
  })

  it.each([
    ['lossy', webpLossy(1024, 768)],
    ['lossless', webpLossless(1024, 768)],
    ['extended', webpExtended(1024, 768)]
  ])('reads a %s WebP', (_name, content) => {
    expect(readImageSize(content, 'image/webp')).toEqual({ width: 1024, height: 768 })
  })

  it('reads an AVIF from its ispe box', () => {
    expect(readImageSize(avif([1600, 900]), 'image/avif')).toEqual({ width: 1600, height: 900 })
  })

  it('takes the largest ispe of an AVIF, not a thumbnail', () => {
    expect(readImageSize(avif([160, 90], [1600, 900]), 'image/avif')).toEqual({
      width: 1600,
      height: 900
    })
  })

  it.each([
    ['a truncated PNG', png(10, 10).slice(0, 12), 'image/png'],
    ['a JPEG with no frame header', bytesOf([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg'],
    ['a truncated JPEG frame', jpeg(10, 10).slice(0, 8), 'image/jpeg'],
    ['a WebP with an unknown chunk', riff('JUNK', [0, 0, 0, 0]), 'image/webp'],
    ['an AVIF with no ispe box', bytesOf(box('ftyp', ascii('avif'))), 'image/avif']
  ] as const)('returns null for %s', (_name, content, type) => {
    expect(readImageSize(content, type)).toBeNull()
  })

  it('returns null for a zero or over-cap dimension', () => {
    expect(readImageSize(png(0, 10), 'image/png')).toBeNull()
    expect(readImageSize(png(MEDIA.maxDimension + 1, 10), 'image/png')).toBeNull()
    expect(readImageSize(png(MEDIA.maxDimension, MEDIA.maxDimension), 'image/png')).not.toBeNull()
  })
})
