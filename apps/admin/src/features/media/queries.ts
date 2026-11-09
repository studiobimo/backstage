import {
  MEDIA,
  mediaListResponseSchema,
  mediaResponseSchema,
  type MediaAlt
} from '@studiobimo/backstage'
import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'

import type { ProcessedImage } from './process-image'

export interface MediaUploadInput extends MediaAlt {
  image: ProcessedImage
}

export const uploadMediaMutation = mutationOptions({
  mutationFn: async ({ image, decorative, alt }: MediaUploadInput) => {
    const body = new FormData()
    body.set(MEDIA.upload.fileField, image.file)
    body.set(
      MEDIA.upload.metadataField,
      JSON.stringify({ width: image.width, height: image.height, decorative, alt })
    )
    const response = await apiRequest('/media', { method: 'POST', body })
    return mediaResponseSchema.parse(await response.json()).media
  }
})

export const mediaListQuery = queryOptions({
  queryKey: ['media'],
  queryFn: async () =>
    mediaListResponseSchema.parse(await (await apiRequest('/media')).json()).media
})

export const mediaFileUrl = (id: string) => `/api/v1/media/${id}/file`
