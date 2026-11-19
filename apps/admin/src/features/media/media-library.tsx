import type { Media } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { ImageIcon, Plus, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FrameSection } from '@/components/frame-section'
import { IconButton } from '@/components/icon-button'
import { ListNotice } from '@/components/list-notice'
import { SearchField } from '@/components/search-field'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocaleConfig } from '@/features/config/queries'

import { altStatusOf, filterMedia, usedBytesOf } from './alt-status'
import { DeleteMediaDialog } from './delete-media-dialog'
import { ImageCard } from './image-card'
import { imageDetailOf } from './media-details'
import { mediaFileUrl, mediaListQuery } from './queries'
import { StorageMeter } from './storage-meter'

function LibraryGrid({ items, onDelete }: { items: Media[]; onDelete: (media: Media) => void }) {
  const { t, i18n } = useTranslation('media')
  const { locales } = useLocaleConfig()
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((media) => (
        <li key={media.id} className="min-w-0">
          <ImageCard
            src={mediaFileUrl(media.id)}
            name={media.filename}
            detail={imageDetailOf(media, i18n.language, t)}
            altStatus={altStatusOf(media, locales)}
            actions={
              <IconButton
                label={t('library.delete', { name: media.filename })}
                variant="secondary"
                size="icon-sm"
                onClick={() => onDelete(media)}
              >
                <Trash2Icon aria-hidden />
              </IconButton>
            }
          />
        </li>
      ))}
    </ul>
  )
}

function EmptyLibrary({ onUpload }: { onUpload: () => void }) {
  const { t } = useTranslation('media')
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageIcon />
        </EmptyMedia>
        <EmptyTitle>{t('library.emptyTitle')}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onUpload}>
          <Plus />
          {t('library.upload')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function LibraryBody({
  items,
  query,
  onDelete
}: {
  items: Media[]
  query: string
  onDelete: (media: Media) => void
}) {
  const { t } = useTranslation('media')
  const visible = filterMedia(items, query)
  if (visible.length === 0) {
    return (
      <ListNotice title={t('library.noMatchTitle')} description={t('library.noMatchDescription')} />
    )
  }
  return <LibraryGrid items={visible} onDelete={onDelete} />
}

export function MediaLibrary({ onUpload }: { onUpload: () => void }) {
  const { t } = useTranslation('media')
  const { data, isPending, isError } = useQuery(mediaListQuery)
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<Media>()
  if (isPending) return <Skeleton className="h-64 w-full" />
  if (isError) return <p role="alert">{t('picker.loadFailed')}</p>
  if (data.length === 0) return <EmptyLibrary onUpload={onUpload} />
  return (
    <>
      <FrameSection
        title={t('library.heading')}
        description={t('library.count', { count: data.length })}
        actions={
          <SearchField
            label={t('library.searchLabel')}
            placeholder={t('library.searchPlaceholder')}
            value={query}
            onChange={setQuery}
          />
        }
        panelClassName="flex flex-col gap-6"
      >
        <div className="max-w-md">
          <StorageMeter usedBytes={usedBytesOf(data)} />
        </div>
        <LibraryBody items={data} query={query} onDelete={setDeleting} />
      </FrameSection>
      {deleting && (
        <DeleteMediaDialog
          media={deleting}
          open
          onOpenChange={(open) => !open && setDeleting(undefined)}
        />
      )}
    </>
  )
}
