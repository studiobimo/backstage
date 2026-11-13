import type { Media } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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

import { mediaFileUrl, mediaListQuery } from './queries'

interface MediaPickerProps {
  label: string
  value: string | null | undefined
  onChange: (id: string | null) => void
}

function Thumbnail({ media, className }: { media: Pick<Media, 'id'>; className?: string }) {
  return (
    <img
      src={mediaFileUrl(media.id)}
      alt=""
      loading="lazy"
      className={className ?? 'aspect-square w-full rounded-md object-cover'}
    />
  )
}

function Library({
  value,
  onPick
}: {
  value: string | null | undefined
  onPick: (id: string) => void
}) {
  const { t } = useTranslation('media')
  const { data, isPending, isError } = useQuery(mediaListQuery)
  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p role="alert">{t('picker.loadFailed')}</p>
  if (data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageIcon />
          </EmptyMedia>
          <EmptyTitle>{t('library.emptyTitle')}</EmptyTitle>
          <EmptyDescription>
            <Link to="/media" className="underline">
              {t('library.upload')}
            </Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <RadioGroup
      aria-label={t('library.label')}
      value={value ?? ''}
      onValueChange={(next) => onPick(String(next))}
      className="grid grid-cols-2 gap-3"
    >
      {data.map((media) => (
        <RadioPrimitive.Root
          key={media.id}
          value={media.id}
          aria-label={media.filename}
          className="flex flex-col gap-1.5 rounded-lg border p-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring data-checked:border-primary data-checked:bg-accent"
        >
          <Thumbnail media={media} />
          <span className="truncate text-xs">{media.filename}</span>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  )
}

export function MediaPicker({ label, value, onChange }: MediaPickerProps) {
  const { t } = useTranslation('media')
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        <Thumbnail media={{ id: value }} className="size-16 rounded-md border object-cover" />
      ) : null}
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
