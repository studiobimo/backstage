import type { Media } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ListNotice } from '@/components/list-notice'
import { SearchField } from '@/components/search-field'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioPrimitive } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'

import { useLocaleConfig } from '@/features/config/queries'

import { altStatusOf, filterMedia } from './alt-status'
import { ImageCard } from './image-card'
import { imageDetailOf } from './media-details'
import { EmptyLibrary } from './media-library'
import { mediaFileUrl, mediaListQuery } from './queries'
import { PendingCard, UploaderLayer, UploadButton } from './uploader-parts'
import { useMediaUploader, type MediaUploader } from './use-media-uploader'

interface MediaPickerProps {
  label: string
  value: string | null | undefined
  onChange: (id: string | null) => void
}

function SelectedThumbnail({ id }: { id: string }) {
  return (
    <img
      src={mediaFileUrl(id)}
      alt=""
      loading="lazy"
      className="size-16 rounded-md border object-cover"
    />
  )
}

function PickerGrid({
  items,
  value,
  uploader,
  onPick
}: {
  items: Media[]
  value: string | null | undefined
  uploader: MediaUploader
  onPick: (id: string) => void
}) {
  const { t, i18n } = useTranslation('media')
  const { locales } = useLocaleConfig()
  return (
    <RadioGroup
      aria-label={t('library.label')}
      value={value ?? ''}
      onValueChange={(next) => onPick(String(next))}
      className="grid grid-cols-2 gap-3"
    >
      {uploader.pending.map((upload) => (
        <PendingCard key={upload.key} upload={upload} uploader={uploader} />
      ))}
      {items.map((media) => (
        <RadioPrimitive.Root
          key={media.id}
          value={media.id}
          aria-label={media.filename}
          render={
            <ImageCard
              src={mediaFileUrl(media.id)}
              name={media.filename}
              detail={imageDetailOf(media, i18n.language, t)}
              altStatus={altStatusOf(media, locales)}
              className="cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-accent"
            />
          }
        />
      ))}
    </RadioGroup>
  )
}

function Library({
  value,
  onPick,
  onUploaded
}: {
  value: string | null | undefined
  onPick: (id: string) => void
  onUploaded: (id: string) => void
}) {
  const { t } = useTranslation('media')
  const { data, isPending, isError } = useQuery(mediaListQuery)
  const uploader = useMediaUploader({ onUploaded: (media) => onUploaded(media.id) })
  const [query, setQuery] = useState('')
  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p role="alert">{t('picker.loadFailed')}</p>
  const visible = filterMedia(data, query)
  const empty = data.length === 0 && uploader.pending.length === 0
  return (
    <div className="flex flex-col gap-4">
      {empty ? (
        <EmptyLibrary onFiles={uploader.addFiles} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton onFiles={uploader.addFiles}>{t('library.upload')}</UploadButton>
            <SearchField
              label={t('library.searchLabel')}
              placeholder={t('library.searchPlaceholder')}
              value={query}
              onChange={setQuery}
            />
          </div>
          {visible.length === 0 && uploader.pending.length === 0 ? (
            <ListNotice
              title={t('library.noMatchTitle')}
              description={t('library.noMatchDescription')}
            />
          ) : (
            <PickerGrid items={visible} value={value} uploader={uploader} onPick={onPick} />
          )}
        </>
      )}
      <UploaderLayer uploader={uploader} />
    </div>
  )
}

export function MediaPicker({ label, value, onChange }: MediaPickerProps) {
  const { t } = useTranslation('media')
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? <SelectedThumbnail id={value} /> : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" />}>
          {value ? t('library.change', { label }) : t('library.choose', { label })}
        </SheetTrigger>
        <SheetPopup>
          <SheetHeader>
            <SheetTitle>{t('library.title')}</SheetTitle>
            <SheetDescription>{t('library.description')}</SheetDescription>
          </SheetHeader>
          <SheetPanel>
            <Library
              value={value}
              onPick={(id) => {
                onChange(id)
                setOpen(false)
              }}
              onUploaded={onChange}
            />
          </SheetPanel>
        </SheetPopup>
      </Sheet>
      {value ? (
        <Button variant="ghost" onClick={() => onChange(null)}>
          {t('library.remove', { label })}
        </Button>
      ) : null}
    </div>
  )
}
