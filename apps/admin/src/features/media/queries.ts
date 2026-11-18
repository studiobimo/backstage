import { MEDIA } from '@studiobimo/backstage'
import {
  mediaListResponseSchema,
  mediaResponseSchema,
  type MediaAlt
} from '@studiobimo/backstage/internal'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api'
import { uploadRequest } from '@/lib/upload-request'

import type { ProcessedImage } from './process-image'

export interface MediaUploadInput extends MediaAlt {
  image: ProcessedImage
  onProgress: (fraction: number) => void
}

export const mediaListQuery = queryOptions({
  queryKey: ['media'],
  queryFn: async () =>
    mediaListResponseSchema.parse(await (await apiRequest('/media')).json()).media
})

const refresh = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: mediaListQuery.queryKey })

export const uploadMediaMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async ({ image, decorative, alt, onProgress }: MediaUploadInput) => {
      const body = new FormData()
      body.set(MEDIA.upload.fileField, image.file)
      body.set(MEDIA.upload.metadataField, JSON.stringify({ decorative, alt }))
      const response = await uploadRequest('/media', body, onProgress)
      return mediaResponseSchema.parse(await response.json()).media
    },
    onSuccess: () => refresh(queryClient)
  })

export const deleteMediaMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: async (id: string) => {
      await apiRequest(`/media/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => refresh(queryClient)
  })

export const mediaFileUrl = (id: string) => `/api/v1/media/${id}/file`
