import type { Media, MediaUsage } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { DeleteDialog } from '@/components/delete-dialog'
import { ApiError } from '@/lib/api'

import { deleteMediaMutation } from './queries'

interface DeleteMediaDialogProps {
  media: Media
  open: boolean
  onOpenChange: (open: boolean) => void
}

const usageLabelOf = (usage: MediaUsage, language: string, t: TFunction<'media'>) => {
  const titles = Object.entries(usage.label)
  const own = titles.find(([locale]) => language.startsWith(locale))?.[1]
  return own || titles.find(([, title]) => title)?.[1] || t(`usage.${usage.kind}`)
}

function UsageList({ usedBy }: { usedBy: MediaUsage[] }) {
  const { t, i18n } = useTranslation('media')
  return (
    <ul className="mt-2 list-disc ps-5">
      {usedBy.map((usage) => {
        const label = usageLabelOf(usage, i18n.language, t)
        return (
          <li key={`${usage.kind}-${usage.id}`}>
            {usage.kind === 'page' ? (
              <Link to="/pages/$pageId" params={{ pageId: usage.id }} className="underline">
                {label}
              </Link>
            ) : (
              label
            )}
          </li>
        )
      })}
    </ul>
  )
}

const usageOf = (error: Error) =>
  error instanceof ApiError && error.usedBy.length > 0 ? error.usedBy : null

export function DeleteMediaDialog({ media, open, onOpenChange }: DeleteMediaDialogProps) {
  const { t } = useTranslation('media')
  const remove = useMutation(deleteMediaMutation(useQueryClient()))
  return (
    <DeleteDialog
      id={media.id}
      remove={remove}
      open={open}
      onOpenChange={onOpenChange}
      title={t('delete.title', { name: media.filename })}
      description={t('delete.description')}
      cancelLabel={t('delete.cancel')}
      confirmLabel={t('delete.confirm')}
      failureDetail={(error) => {
        const usedBy = usageOf(error)
        return usedBy && <UsageList usedBy={usedBy} />
      }}
    />
  )
}
