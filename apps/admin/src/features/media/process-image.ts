import { MEDIA, sniffImageType, type MediaType } from '@studiobimo/backstage'

export const IMAGE_REJECTION = {
  unsupported: 'unsupported',
  tooLarge: 'too_large',
  unreadable: 'unreadable'
} as const

type ImageRejectionReason = (typeof IMAGE_REJECTION)[keyof typeof IMAGE_REJECTION]

export class ImageRejected extends Error {
  readonly reason: ImageRejectionReason
  constructor(reason: ImageRejectionReason) {
    super(reason)
    this.reason = reason
  }
}

export interface Size {
  width: number
  height: number
}

interface DecodedImage extends Size {
  close: () => void
}

export interface ImageCodec {
  decode: (file: Blob) => Promise<DecodedImage>
  encode: (image: DecodedImage, size: Size, type: MediaType) => Promise<Blob>
}

export interface ProcessedImage extends Size {
  file: File
  contentType: MediaType
}

const ENCODE = { quality: 0.85, avifFallback: 'image/webp' } as const satisfies {
  quality: number
  avifFallback: MediaType
}

export const fitWithin = ({ width, height }: Size, maxDimension: number): Size => {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export const outputTypeFor = (type: MediaType): MediaType =>
  type === 'image/avif' ? ENCODE.avifFallback : type

export const renamedFor = (filename: string, type: MediaType) => {
  const stem = filename.replace(/\.[^.]+$/, '') || 'image'
  return `${stem}.${MEDIA.types[type].extension}`
}

const isMediaType = (type: string): type is MediaType => type in MEDIA.types

const browserCodec: ImageCodec = {
  decode: (file) => createImageBitmap(file, { imageOrientation: 'from-image' }),
  encode: async (image, { width, height }, type) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new ImageRejected(IMAGE_REJECTION.unreadable)
    context.drawImage(image as unknown as ImageBitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type, quality: ENCODE.quality })
  }
}

const sniffBlob = async (file: Blob) =>
  sniffImageType(new Uint8Array(await file.slice(0, MEDIA.sniffBytes).arrayBuffer()))

const decodeOrReject = async (codec: ImageCodec, file: Blob) => {
  try {
    return await codec.decode(file)
  } catch {
    throw new ImageRejected(IMAGE_REJECTION.unreadable)
  }
}

export const processImage = async (
  file: File,
  codec: ImageCodec = browserCodec
): Promise<ProcessedImage> => {
  if (file.size > MEDIA.maxSourceBytes) throw new ImageRejected(IMAGE_REJECTION.tooLarge)
  const sniffed = await sniffBlob(file)
  if (!sniffed) throw new ImageRejected(IMAGE_REJECTION.unsupported)

  const decoded = await decodeOrReject(codec, file)
  try {
    const size = fitWithin(decoded, MEDIA.maxDimension)
    const encoded = await codec.encode(decoded, size, outputTypeFor(sniffed))
    if (!isMediaType(encoded.type)) throw new ImageRejected(IMAGE_REJECTION.unsupported)
    if (encoded.size > MEDIA.maxBytes) throw new ImageRejected(IMAGE_REJECTION.tooLarge)
    return {
      ...size,
      contentType: encoded.type,
      file: new File([encoded], renamedFor(file.name, encoded.type), { type: encoded.type })
    }
  } finally {
    decoded.close()
  }
}
