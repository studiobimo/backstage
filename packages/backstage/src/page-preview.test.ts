import { describe, expect, it } from 'vitest'

import {
  generatePreviewToken,
  isPreviewExpired,
  isPreviewToken,
  PAGE_PREVIEW,
  pagePreviewOf,
  previewExpiresAt,
  previewKey,
  previewPathOf
} from './page-preview.ts'

const NOW = 1_700_000_000_000
const ONE_HOUR_MS = 3_600_000
const TOKEN_COUNT = 500

const decodedLength = (token: string) =>
  atob(token.replaceAll('-', '+').replaceAll('_', '/')).length

describe('preview tokens', () => {
  it('are 32 random bytes written as 43 URL-safe characters', () => {
    const token = generatePreviewToken()
    expect(token).toHaveLength(PAGE_PREVIEW.token.length)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodedLength(token)).toBe(PAGE_PREVIEW.token.bytes)
    expect(isPreviewToken(token)).toBe(true)
  })

  it('never repeat', () => {
    const tokens = new Set(Array.from({ length: TOKEN_COUNT }, generatePreviewToken))
    expect(tokens.size).toBe(TOKEN_COUNT)
  })

  it('reject anything that is not a token', () => {
    for (const value of ['', 'short', `${generatePreviewToken()}x`, 'a/b'.padEnd(43, 'a')]) {
      expect(isPreviewToken(value)).toBe(false)
    }
  })

  it('name a KV key and a path apart from published pages and block previews', () => {
    const token = generatePreviewToken()
    expect(previewKey(token)).toBe(`preview:${token}`)
    expect(previewPathOf(token)).toBe(`/__preview/pages/${token}`)
    expect(previewPathOf(token, 'es')).toBe(`/__preview/pages/${token}?locale=es`)
  })
})

describe('preview expiry', () => {
  it('lasts one hour', () => {
    expect(PAGE_PREVIEW.ttlSeconds).toBe(ONE_HOUR_MS / PAGE_PREVIEW.millisecondsPerSecond)
    expect(previewExpiresAt(NOW)).toBe(NOW + ONE_HOUR_MS)
    expect(pagePreviewOf([], NOW).expiresAt).toBe(NOW + ONE_HOUR_MS)
  })

  it('is over at the expiry time and not before', () => {
    const preview = pagePreviewOf([], NOW)
    expect(isPreviewExpired(preview, NOW + ONE_HOUR_MS - 1)).toBe(false)
    expect(isPreviewExpired(preview, NOW + ONE_HOUR_MS)).toBe(true)
  })
})
