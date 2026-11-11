import { MEDIA } from '../media.ts'

const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

export interface MediaObject {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}

export interface MediaReader {
  get(key: string): Promise<MediaObject | null>
}

export async function respondWithMedia(bucket: MediaReader, request: Request) {
  const object = await bucket.get(new URL(request.url).pathname.slice(1))
  if (!object) return null
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? FALLBACK_CONTENT_TYPE,
      'Cache-Control': MEDIA.cacheControl
    }
  })
}
