import type { Media, MediaAlt } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { ImageRejected, processImage, type ProcessedImage } from './process-image'
import { uploadMediaMutation } from './queries'
import { useFileDrop } from './use-file-drop'

export interface AwaitingImage {
  key: string
  image: ProcessedImage
  previewUrl: string
}

export interface PendingUpload {
  key: string
  name: string
  previewUrl: string
  progress: number
  failure?: string
}

interface UploaderOptions {
  onUploaded?: (media: Media) => void
  acceptDrops?: boolean
}

const rejectionReasonOf = (error: unknown) =>
  error instanceof ImageRejected ? error.reason : 'unreadable'

const withoutKey = <T extends { key: string }>(items: T[], key: string) =>
  items.filter((item) => item.key !== key)

export function useMediaUploader({ onUploaded, acceptDrops = true }: UploaderOptions = {}) {
  const { t } = useTranslation('media')
  const messageOf = useApiErrorMessage()
  const upload = useMutation(uploadMediaMutation(useQueryClient()))
  const [awaiting, setAwaiting] = useState<AwaitingImage[]>([])
  const [pending, setPending] = useState<PendingUpload[]>([])

  const patchPending = (key: string, patch: Partial<PendingUpload>) =>
    setPending((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  async function prepare(file: File) {
    try {
      const image = await processImage(file)
      const next = { key: crypto.randomUUID(), image, previewUrl: URL.createObjectURL(image.file) }
      setAwaiting((items) => [...items, next])
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: t('picker.rejected', { name: file.name }),
        description: t(`rejections.${rejectionReasonOf(error)}`)
      })
    }
  }

  const addFiles = async (files: File[]) => {
    for (const file of files) await prepare(file)
  }

  async function submit({ key, image, previewUrl }: AwaitingImage, alt: MediaAlt) {
    setAwaiting((items) => withoutKey(items, key))
    setPending((items) => [...items, { key, name: image.file.name, previewUrl, progress: 0 }])
    try {
      const media = await upload.mutateAsync({
        image,
        ...alt,
        onProgress: (progress) => patchPending(key, { progress })
      })
      setPending((items) => withoutKey(items, key))
      URL.revokeObjectURL(previewUrl)
      onUploaded?.(media)
    } catch (error) {
      patchPending(key, { failure: messageOf(error) })
    }
  }

  const discard = (key: string, previewUrl: string) => {
    URL.revokeObjectURL(previewUrl)
    setAwaiting((items) => withoutKey(items, key))
    setPending((items) => withoutKey(items, key))
  }

  const dragging = useFileDrop(addFiles, acceptDrops)
  return { addFiles, awaiting, pending, submit, discard, dragging }
}

export type MediaUploader = ReturnType<typeof useMediaUploader>
