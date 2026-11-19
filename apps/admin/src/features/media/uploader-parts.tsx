import { mediaTypes } from '@studiobimo/backstage/internal'
import { ImagePlusIcon, Upload } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue
} from '@/components/ui/progress'

import { DescribeImageDialog } from './describe-image-dialog'
import { ImageCard } from './image-card'
import type { MediaUploader, PendingUpload } from './use-media-uploader'

const PERCENT = 100

export function UploadButton({
  onFiles,
  variant,
  children
}: Pick<ButtonProps, 'variant'> & { onFiles: (files: File[]) => void; children: ReactNode }) {
  const { t } = useTranslation('media')
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={mediaTypes.join(',')}
        aria-label={t('picker.label')}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      <Button variant={variant} onClick={() => input.current?.click()}>
        <Upload aria-hidden />
        {children}
      </Button>
    </>
  )
}

function DropOverlay() {
  const { t } = useTranslation('media')
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm"
    >
      <div className="flex size-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-primary border-dashed text-center">
        <ImagePlusIcon className="size-10 text-primary" aria-hidden />
        <p className="font-medium text-lg">{t('drop.title')}</p>
        <p className="max-w-md text-balance text-muted-foreground text-sm">{t('drop.hint')}</p>
      </div>
    </div>
  )
}

export function UploaderLayer({ uploader }: { uploader: MediaUploader }) {
  return (
    <>
      {uploader.dragging && <DropOverlay />}
      <DescribeImageDialog
        awaiting={uploader.awaiting}
        onSubmit={(item, alt) => void uploader.submit(item, alt)}
        onCancel={(item) => uploader.discard(item.key, item.previewUrl)}
      />
    </>
  )
}

function PendingStatus({ upload, onDismiss }: { upload: PendingUpload; onDismiss: () => void }) {
  const { t } = useTranslation('media')
  if (upload.failure) {
    return (
      <div className="flex flex-col items-start gap-1">
        <p role="alert" className="text-destructive-foreground text-xs">
          {upload.failure}
        </p>
        <Button size="xs" variant="outline" onClick={onDismiss}>
          {t('pending.dismiss')}
        </Button>
      </div>
    )
  }
  return (
    <Progress value={Math.round(upload.progress * PERCENT)}>
      <div className="flex items-center justify-between gap-2">
        <ProgressLabel className="text-muted-foreground text-xs">
          {t('pending.uploading')}
        </ProgressLabel>
        <ProgressValue className="text-xs" />
      </div>
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  )
}

export function PendingCard({
  upload,
  uploader
}: {
  upload: PendingUpload
  uploader: MediaUploader
}) {
  return (
    <ImageCard
      src={upload.previewUrl}
      name={upload.name}
      className="opacity-90"
      footer={
        <PendingStatus
          upload={upload}
          onDismiss={() => uploader.discard(upload.key, upload.previewUrl)}
        />
      }
    />
  )
}
