import { API_ERROR, errorBody, type ApiError } from '../errors.ts'
import { ensureUser } from '../db/users.ts'
import { deleteMedia, findMediaFileKey, insertMedia, listMedia } from '../db/media.ts'
import { findMediaUsage } from '../db/media-usage.ts'
import { MEDIA, mediaKeyOf, mediaAltSchema, sniffImageType } from '../media.ts'
import { readImageSize } from '../image-size.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { Registry } from '../blocks.ts'
import { Hono } from 'hono'
import type { z } from 'zod'

import type { AccessEnv } from './auth.ts'
import { RESPONSE_STATUS, respondWithError } from './respond.ts'

type Rejection = { error: ApiError }
type Upload = { file: File; metadata: z.infer<ReturnType<typeof mediaAltSchema>> }

const rejection = (error: ApiError): Rejection => ({ error })

const declaredTooLarge = (header: string | null) => {
  const length = Number(header)
  return (
    header === null ||
    !Number.isFinite(length) ||
    length > MEDIA.maxBytes + MEDIA.metadataSlackBytes
  )
}

const parseMetadata = (raw: unknown, locales: readonly string[]) => {
  if (typeof raw !== 'string') return null
  try {
    return mediaAltSchema(locales).safeParse(JSON.parse(raw))
  } catch {
    return null
  }
}

const readUpload = async (
  request: Request,
  locales: readonly string[]
): Promise<Upload | Rejection> => {
  if (declaredTooLarge(request.headers.get('content-length'))) {
    return rejection(API_ERROR.tooLarge)
  }
  const form = await request.formData().catch(() => null)
  const file = form?.get(MEDIA.upload.fileField)
  const metadata = parseMetadata(form?.get(MEDIA.upload.metadataField) ?? null, locales)
  if (!(file instanceof File) || !metadata?.success) return rejection(API_ERROR.invalid)
  if (file.size === 0) return rejection(API_ERROR.invalid)
  if (file.size > MEDIA.maxBytes) return rejection(API_ERROR.tooLarge)
  return { file, metadata: metadata.data }
}

export const mediaRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ media: await listMedia(c.env.DB) }))
    .get('/:id/file', async (c) => {
      const key = await findMediaFileKey(c.env.DB, c.req.param('id'))
      const object = key ? await c.env.MEDIA.get(key) : null
      if (!object) return respondWithError(c, API_ERROR.notFound)
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': MEDIA.cacheControl
        }
      })
    })
    .post('/', async (c) => {
      const upload = await readUpload(c.req.raw, resolveLocaleConfig(registry).locales)
      if ('error' in upload) return respondWithError(c, upload.error)
      const { file, metadata } = upload
      const content = await file.arrayBuffer()
      const contentType = sniffImageType(new Uint8Array(content.slice(0, MEDIA.sniffBytes)))
      if (!contentType) return respondWithError(c, API_ERROR.unsupportedMedia)
      const size = readImageSize(new Uint8Array(content), contentType)
      if (!size) return respondWithError(c, API_ERROR.invalid)

      const id = crypto.randomUUID()
      const r2Key = mediaKeyOf(id, contentType)
      await c.env.MEDIA.put(r2Key, content, {
        httpMetadata: { contentType, cacheControl: MEDIA.cacheControl }
      })
      const saved = {
        id,
        filename: file.name,
        contentType,
        size: file.size,
        ...size,
        decorative: metadata.decorative,
        alt: metadata.decorative ? {} : metadata.alt
      }
      try {
        const uploadedBy = await ensureUser(c.env.DB, c.get('editor'))
        await insertMedia(c.env.DB, { ...saved, r2Key, uploadedBy })
      } catch (error) {
        await c.env.MEDIA.delete(r2Key)
        throw error
      }
      return c.json({ media: saved }, RESPONSE_STATUS.created)
    })
    .delete('/:id', async (c) => {
      const usedBy = await findMediaUsage(c.env.DB, c.req.param('id'))
      if (usedBy.length > 0) {
        return c.json({ ...errorBody(API_ERROR.mediaInUse), usedBy }, API_ERROR.mediaInUse.status)
      }
      const r2Key = await deleteMedia(c.env.DB, c.req.param('id'))
      if (!r2Key) return respondWithError(c, API_ERROR.notFound)
      await c.env.MEDIA.delete(r2Key)
      return c.body(null, RESPONSE_STATUS.noContent)
    })
    .delete('/:id', async (c) => {
      const id = c.req.param('id')
      const usedBy = await findMediaUsage(c.env.DB, id)
      if (usedBy.length > 0) {
        return c.json({ ...errorBody(API_ERROR.mediaInUse), usedBy }, API_ERROR.mediaInUse.status)
      }
      const r2Key = await deleteMedia(c.env.DB, id)
      if (!r2Key) return respondWithError(c, API_ERROR.notFound)
      await c.env.MEDIA.delete(r2Key)
      return c.body(null, RESPONSE_STATUS.noContent)
    })
