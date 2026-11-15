import { z } from 'zod'

import { PREVIEW_ROOT } from './blocks.ts'
import { readableSnapshotSchema, type Snapshot } from './publishing.ts'

export const PAGE_PREVIEW = {
  path: `${PREVIEW_ROOT}/pages`,
  localeParam: 'locale',
  format: 1,
  ttlSeconds: 3600,
  millisecondsPerSecond: 1000,
  token: { bytes: 32, length: 43, alphabet: 'A-Za-z0-9_-' },
  key: { prefix: 'preview', separator: ':' }
} as const

const TOKEN_PATTERN = new RegExp(`^[${PAGE_PREVIEW.token.alphabet}]{${PAGE_PREVIEW.token.length}}$`)

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')

export const generatePreviewToken = () =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(PAGE_PREVIEW.token.bytes)))

export const isPreviewToken = (value: string) => TOKEN_PATTERN.test(value)

export const previewKey = (token: string) =>
  [PAGE_PREVIEW.key.prefix, token].join(PAGE_PREVIEW.key.separator)

export const previewPathOf = (token: string, locale?: string) => {
  const path = `${PAGE_PREVIEW.path}/${token}`
  return locale ? `${path}?${PAGE_PREVIEW.localeParam}=${encodeURIComponent(locale)}` : path
}

export const previewExpiresAt = (now: number) =>
  now + PAGE_PREVIEW.ttlSeconds * PAGE_PREVIEW.millisecondsPerSecond

export const pagePreviewSchema = z.object({
  format: z.literal(PAGE_PREVIEW.format),
  expiresAt: z.number().int(),
  snapshots: z.array(readableSnapshotSchema)
})
export type PagePreview = z.infer<typeof pagePreviewSchema>

export const pagePreviewOf = (snapshots: Snapshot[], now: number): PagePreview => ({
  format: PAGE_PREVIEW.format,
  expiresAt: previewExpiresAt(now),
  snapshots
})

export const isPreviewExpired = ({ expiresAt }: Pick<PagePreview, 'expiresAt'>, now: number) =>
  expiresAt <= now

export const previewResponseSchema = z.object({
  token: z.string(),
  path: z.string(),
  expiresAt: z.number().int()
})
