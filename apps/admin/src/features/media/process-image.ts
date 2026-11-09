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
  encode: (image: DecodedImage, size: Size, type: MediaType, quality: number) => Promise<Blob>
}

export interface ProcessedImage extends Size {
  file: File
  contentType: MediaType
}

const ENCODE = {
  qualitySteps: [0.85, 0.7, 0.55, 0.4],
  lossless: 'image/png',
  avifFallback: 'image/webp'
} as const satisfies { qualitySteps: number[]; lossless: MediaType; avifFallback: MediaType }

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
  encode: async (image, { width, height }, type, quality) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new ImageRejected(IMAGE_REJECTION.unreadable)
    context.drawImage(image as unknown as ImageBitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type, quality })
  }
}

const sniffBlob = async (file: Blob) =>
  sniffImageType(new Uint8Array(await file.slice(0, MEDIA.sniffBytes).arrayBuffer()))

const qualityStepsFor = (type: MediaType) =>
  type === ENCODE.lossless ? ENCODE.qualitySteps.slice(0, 1) : ENCODE.qualitySteps

const encodeWithinCap = async (
  codec: ImageCodec,
  decoded: DecodedImage,
  size: Size,
  type: MediaType
) => {
  let encoded = new Blob()
  for (const quality of qualityStepsFor(type)) {
    encoded = await codec.encode(decoded, size, type, quality)
    if (encoded.size <= MEDIA.maxBytes) break
  }
  return encoded
}

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
    const encoded = await encodeWithinCap(codec, decoded, size, outputTypeFor(sniffed))
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
