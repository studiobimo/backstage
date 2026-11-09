import {
  API_ERROR,
  ensureUser,
  findMediaFileKey,
  insertMedia,
  listMedia,
  MEDIA,
  mediaKeyOf,
  mediaUploadSchema,
  sniffImageType,
  type ApiError
} from '@studiobimo/backstage'
import { Hono } from 'hono'

import type { AccessEnv } from './auth'
import { RESPONSE_STATUS, respondWithError } from './respond'

type Rejection = { error: ApiError }
type Upload = { file: File; metadata: ReturnType<typeof mediaUploadSchema.parse> }

const rejection = (error: ApiError): Rejection => ({ error })

const declaredTooLarge = (header: string | null) => {
  const length = Number(header)
  return (
    header === null ||
    !Number.isFinite(length) ||
    length > MEDIA.maxBytes + MEDIA.metadataSlackBytes
  )
}

const parseMetadata = (raw: unknown) => {
  if (typeof raw !== 'string') return null
  try {
    return mediaUploadSchema.safeParse(JSON.parse(raw))
  } catch {
    return null
  }
}

const readUpload = async (request: Request): Promise<Upload | Rejection> => {
  if (declaredTooLarge(request.headers.get('content-length'))) {
    return rejection(API_ERROR.tooLarge)
  }
  const form = await request.formData().catch(() => null)
  const file = form?.get(MEDIA.upload.fileField)
  const metadata = parseMetadata(form?.get(MEDIA.upload.metadataField) ?? null)
  if (!(file instanceof File) || !metadata?.success) return rejection(API_ERROR.invalid)
  if (file.size === 0) return rejection(API_ERROR.invalid)
  if (file.size > MEDIA.maxBytes) return rejection(API_ERROR.tooLarge)
  return { file, metadata: metadata.data }
}

const sniffFile = async (file: File) =>
  sniffImageType(new Uint8Array(await file.slice(0, MEDIA.sniffBytes).arrayBuffer()))

export const mediaRoutes = () =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ media: await listMedia(c.env.DB!) }))
    .get('/:id/file', async (c) => {
      const key = await findMediaFileKey(c.env.DB!, c.req.param('id'))
      const object = key ? await c.env.MEDIA!.get(key) : null
      if (!object) return respondWithError(c, API_ERROR.notFound)
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': MEDIA.cacheControl
        }
      })
    })
    .post('/', async (c) => {
      const upload = await readUpload(c.req.raw)
      if ('error' in upload) return respondWithError(c, upload.error)
      const { file, metadata } = upload
      const contentType = await sniffFile(file)
      if (!contentType) return respondWithError(c, API_ERROR.unsupportedMedia)

      const id = crypto.randomUUID()
      const r2Key = mediaKeyOf(id, contentType)
      await c.env.MEDIA!.put(r2Key, await file.arrayBuffer(), {
        httpMetadata: { contentType, cacheControl: MEDIA.cacheControl }
      })
      const saved = {
        id,
        filename: file.name,
        contentType,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        decorative: metadata.decorative,
        alt: metadata.decorative ? {} : metadata.alt
      }
      try {
        const uploadedBy = await ensureUser(c.env.DB!, c.get('editor'))
        await insertMedia(c.env.DB!, { ...saved, r2Key, uploadedBy })
      } catch (error) {
        await c.env.MEDIA!.delete(r2Key)
        throw error
      }
      return c.json({ media: saved }, RESPONSE_STATUS.created)
    })
