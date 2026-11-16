import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { DeleteDialog } from '@/components/delete-dialog'
import { useLocaleConfig } from '@/features/config/queries'

import { entryLabelText } from './collection-text'
import { deleteEntryMutation } from './queries'

interface DeleteEntryDialogProps {
  entry: Pick<EntrySummary, 'id' | 'label'>
  collection: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteEntryDialog({
  entry,
  collection,
  open,
  onOpenChange,
  onDeleted
}: DeleteEntryDialogProps) {
  const { t, i18n } = useTranslation('collections')
  const { defaultLocale } = useLocaleConfig()
  const queryClient = useQueryClient()
  const options = deleteEntryMutation(queryClient, collection)
  const remove = useMutation({
    ...options,
    onSuccess: async (...args) => {
      await options.onSuccess?.(...args)
      onDeleted?.()
    }
  })
  const name = entryLabelText(entry.label, i18n.language, defaultLocale) || t('list.untitled')
  return (
    <DeleteDialog
      id={entry.id}
      remove={remove}
      open={open}
      onOpenChange={onOpenChange}
      title={t('delete.title', { name })}
      description={t('delete.description')}
      cancelLabel={t('delete.cancel')}
      confirmLabel={t('delete.confirm')}
    />
  )
}
