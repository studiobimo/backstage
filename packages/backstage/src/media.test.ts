import { describe, expect, it } from 'vitest'

import { mediaAltSchema, mediaKeyOf, sniffImageType } from './media.ts'

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(32).fill(0)])
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

describe('sniffImageType', () => {
  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)],
    ['image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ['image/webp', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))],
    ['image/avif', bytes(0, 0, 0, 0x1c, ...ascii('ftyp'), ...ascii('avif'))],
    ['image/avif', bytes(0, 0, 0, 0x1c, ...ascii('ftyp'), ...ascii('avis'))]
  ])('recognises %s by its first bytes', (type, content) => {
    expect(sniffImageType(content)).toBe(type)
  })

  it.each([
    ['a GIF', bytes(...ascii('GIF89a'))],
    ['an SVG', bytes(...ascii('<svg xmlns'))],
    ['a RIFF file that is not WebP', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'))],
    ['an HEIC file', bytes(0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii('heic'))],
    ['an empty file', new Uint8Array()]
  ])('rejects %s', (_name, content) => {
    expect(sniffImageType(content)).toBeNull()
  })
})

describe('mediaKeyOf', () => {
  it('derives the key and extension from the sniffed type', () => {
    expect(mediaKeyOf('abc', 'image/jpeg')).toBe('media/abc.jpg')
  })
})

const LOCALES = ['en', 'es']

describe('alt text', () => {
  it('requires alt text for every locale', () => {
    const result = mediaAltSchema(LOCALES).safeParse({
      decorative: false,
      alt: { en: 'A chair', es: ' ' }
    })
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['alt.es'])
  })

  it('accepts empty alt text for a decorative image', () => {
    expect(
      mediaAltSchema(LOCALES).safeParse({ decorative: true, alt: { en: '', es: '' } }).success
    ).toBe(true)
  })

  it('asks only for the locales the site serves', () => {
    const schema = mediaAltSchema(['fr'])
    expect(schema.safeParse({ decorative: false, alt: { fr: 'Une chaise' } }).success).toBe(true)
    expect(schema.safeParse({ decorative: false, alt: { en: 'A chair' } }).success).toBe(false)
  })

  it('trims alt text', () => {
    const parsed = mediaAltSchema(LOCALES).parse({
      decorative: false,
      alt: { en: ' A chair ', es: 'Una silla' }
    })
    expect(parsed.alt.en).toBe('A chair')
  })
})
