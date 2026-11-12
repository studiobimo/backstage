import { MEDIA, type MediaType } from './media.ts'

export interface ImageSize {
  width: number
  height: number
}

const BITS = { byte: 8, sixteen: 16, lossless: 14 } as const

const FORMAT = {
  png: { widthOffset: 16, heightOffset: 20 },
  jpeg: {
    signatureBytes: 2,
    markerPrefix: 0xff,
    markerBytes: 2,
    heightOffset: 5,
    widthOffset: 7,
    frameHeaderBytes: 9,
    standaloneMarkers: new Set([0x01, 0xd8, 0xd9, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]),
    notFrameMarkers: new Set([0xc4, 0xc8, 0xcc]),
    firstFrameMarker: 0xc0,
    lastFrameMarker: 0xcf
  },
  webp: {
    chunkOffset: 12,
    chunkNameBytes: 4,
    lossy: { widthOffset: 26, heightOffset: 28, mask: 0x3fff },
    lossless: { signatureOffset: 20, signature: 0x2f, sizeOffset: 21, mask: 0x3fff },
    extended: { widthOffset: 24, heightOffset: 27 }
  },
  isobmff: {
    headerBytes: 8,
    nameOffset: 4,
    nameBytes: 4,
    fullBoxBytes: 4,
    dimensionBytes: 4,
    ispeBytes: 12,
    toEndOfFile: 0,
    largeSize: 1,
    containers: { meta: 4, iprp: 0, ipco: 0 } as Record<string, number>
  }
} as const

const be16 = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] ?? 0) << BITS.byte) | (bytes[offset + 1] ?? 0)

const be32 = (bytes: Uint8Array, offset: number) =>
  (be16(bytes, offset) * 2 ** BITS.sixteen + be16(bytes, offset + 2)) >>> 0

const le16 = (bytes: Uint8Array, offset: number) =>
  (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << BITS.byte)

const le24 = (bytes: Uint8Array, offset: number) =>
  le16(bytes, offset) | ((bytes[offset + 2] ?? 0) << BITS.sixteen)

const le32 = (bytes: Uint8Array, offset: number) =>
  (le16(bytes, offset) | (le16(bytes, offset + 2) << BITS.sixteen)) >>> 0

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length))

const readPng = (bytes: Uint8Array): ImageSize => ({
  width: be32(bytes, FORMAT.png.widthOffset),
  height: be32(bytes, FORMAT.png.heightOffset)
})

const isFrameMarker = (marker: number) => {
  const { firstFrameMarker, lastFrameMarker, notFrameMarkers } = FORMAT.jpeg
  return marker >= firstFrameMarker && marker <= lastFrameMarker && !notFrameMarkers.has(marker)
}

const readJpeg = (bytes: Uint8Array): ImageSize | null => {
  const jpeg = FORMAT.jpeg
  let offset = jpeg.signatureBytes
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== jpeg.markerPrefix) return null
    const marker = bytes[offset + 1]!
    if (marker === jpeg.markerPrefix) {
      offset += 1
    } else if (jpeg.standaloneMarkers.has(marker)) {
      offset += jpeg.markerBytes
    } else if (isFrameMarker(marker)) {
      if (offset + jpeg.frameHeaderBytes > bytes.length) return null
      return {
        width: be16(bytes, offset + jpeg.widthOffset),
        height: be16(bytes, offset + jpeg.heightOffset)
      }
    } else {
      offset += jpeg.markerBytes + be16(bytes, offset + jpeg.markerBytes)
    }
  }
  return null
}

const readLossless = (bytes: Uint8Array): ImageSize | null => {
  const { signatureOffset, signature, sizeOffset, mask } = FORMAT.webp.lossless
  if (bytes[signatureOffset] !== signature) return null
  const packed = le32(bytes, sizeOffset)
  return { width: (packed & mask) + 1, height: ((packed >>> BITS.lossless) & mask) + 1 }
}

const readWebp = (bytes: Uint8Array): ImageSize | null => {
  const { chunkOffset, chunkNameBytes, lossy, extended } = FORMAT.webp
  const chunk = ascii(bytes, chunkOffset, chunkNameBytes)
  if (chunk === 'VP8 ') {
    return {
      width: le16(bytes, lossy.widthOffset) & lossy.mask,
      height: le16(bytes, lossy.heightOffset) & lossy.mask
    }
  }
  if (chunk === 'VP8L') return readLossless(bytes)
  if (chunk === 'VP8X') {
    return {
      width: le24(bytes, extended.widthOffset) + 1,
      height: le24(bytes, extended.heightOffset) + 1
    }
  }
  return null
}

const area = ({ width, height }: ImageSize) => width * height

const largest = (sizes: ImageSize[]) =>
  sizes.reduce<ImageSize | null>(
    (best, size) => (!best || area(size) > area(best) ? size : best),
    null
  )

const boxEndOf = (bytes: Uint8Array, offset: number, end: number) => {
  const { toEndOfFile, largeSize } = FORMAT.isobmff
  const declared = be32(bytes, offset)
  return declared === toEndOfFile || declared === largeSize ? end : Math.min(end, offset + declared)
}

const collectIspe = (bytes: Uint8Array, start: number, end: number): ImageSize[] => {
  const iso = FORMAT.isobmff
  const sizes: ImageSize[] = []
  let offset = start
  while (offset + iso.headerBytes <= end) {
    const boxEnd = boxEndOf(bytes, offset, end)
    if (boxEnd < offset + iso.headerBytes) break
    const name = ascii(bytes, offset + iso.nameOffset, iso.nameBytes)
    const payload = offset + iso.headerBytes
    if (name === 'ispe' && boxEnd - payload >= iso.ispeBytes) {
      sizes.push({
        width: be32(bytes, payload + iso.fullBoxBytes),
        height: be32(bytes, payload + iso.fullBoxBytes + iso.dimensionBytes)
      })
    } else if (name in iso.containers) {
      sizes.push(...collectIspe(bytes, payload + iso.containers[name]!, boxEnd))
    }
    offset = boxEnd
  }
  return sizes
}

const readAvif = (bytes: Uint8Array): ImageSize | null =>
  largest(collectIspe(bytes, 0, bytes.length))

const READERS: Record<MediaType, (bytes: Uint8Array) => ImageSize | null> = {
  'image/png': readPng,
  'image/jpeg': readJpeg,
  'image/webp': readWebp,
  'image/avif': readAvif
}

const isWithinLimits = ({ width, height }: ImageSize) =>
  [width, height].every((side) => side >= 1 && side <= MEDIA.maxDimension)

export const readImageSize = (bytes: Uint8Array, type: MediaType): ImageSize | null => {
  const size = READERS[type](bytes)
  return size && isWithinLimits(size) ? size : null
}
