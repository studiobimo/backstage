import { z } from 'zod'

import type { Locale } from './locales.ts'
import { perLocale } from './pages.ts'

export const MEDIA = {
  types: {
    'image/jpeg': { extension: 'jpg' },
    'image/png': { extension: 'png' },
    'image/webp': { extension: 'webp' },
    'image/avif': { extension: 'avif' }
  },
  maxBytes: 5 * 1024 * 1024,
  maxSourceBytes: 30 * 1024 * 1024,
  maxDimension: 2400,
  alt: { maxLength: 300 },
  sniffBytes: 32,
  metadataSlackBytes: 64 * 1024,
  upload: { fileField: 'file', metadataField: 'metadata' },
  cacheControl: 'public, max-age=31536000, immutable'
} as const

export type MediaType = keyof typeof MEDIA.types

export const mediaTypes = Object.keys(MEDIA.types) as MediaType[]

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte)

const asciiAt = (bytes: Uint8Array, offset: number, text: string) =>
  startsWith(
    bytes,
    [...text].map((char) => char.charCodeAt(0)),
    offset
  )

const SIGNATURES: readonly { type: MediaType; matches: (bytes: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  {
    type: 'image/png',
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  },
  {
    type: 'image/webp',
    matches: (bytes) => asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WEBP')
  },
  {
    type: 'image/avif',
    matches: (bytes) =>
      asciiAt(bytes, 4, 'ftyp') && (asciiAt(bytes, 8, 'avif') || asciiAt(bytes, 8, 'avis'))
  }
]

export const sniffImageType = (bytes: Uint8Array): MediaType | null =>
  SIGNATURES.find((signature) => signature.matches(bytes))?.type ?? null

export const mediaKeyOf = (id: string, type: MediaType) =>
  `media/${id}.${MEDIA.types[type].extension}`

const altText = z.string().trim().max(MEDIA.alt.maxLength)

type AltFields = { decorative: boolean; alt: Record<string, string> }

const requireAltUnlessDecorative =
  (locales: readonly Locale[]) => (value: AltFields, context: z.RefinementCtx) => {
    if (value.decorative) return
    for (const locale of locales) {
      if (value.alt[locale]) continue
      context.addIssue({
        code: 'custom',
        path: ['alt', locale],
        message: 'Alt text is required unless the image is decorative'
      })
    }
  }

export const mediaAltSchema = (locales: readonly Locale[]) =>
  z
    .object({ decorative: z.boolean(), alt: perLocale(altText, locales) })
    .superRefine(requireAltUnlessDecorative(locales))
export type MediaAlt = z.infer<ReturnType<typeof mediaAltSchema>>

export const mediaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  decorative: z.boolean(),
  alt: z.record(z.string(), z.string())
})
export type Media = z.infer<typeof mediaSchema>

export const mediaResponseSchema = z.object({ media: mediaSchema })

export const mediaListResponseSchema = z.object({ media: z.array(mediaSchema) })
