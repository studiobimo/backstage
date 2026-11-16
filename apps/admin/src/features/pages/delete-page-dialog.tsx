import type { Page } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { DeleteDialog } from '@/components/delete-dialog'

import { pageLabel } from './page-label'
import { deletePageMutation } from './queries'

interface DeletePageDialogProps {
  page: Page
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePageDialog({ page, open, onOpenChange }: DeletePageDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const remove = useMutation(deletePageMutation(useQueryClient()))
  return (
    <DeleteDialog
      id={page.id}
      remove={remove}
      open={open}
      onOpenChange={onOpenChange}
      title={t('delete.title', { name: pageLabel(page, i18n.language) })}
      description={t('delete.description')}
      cancelLabel={t('form.cancel')}
      confirmLabel={t('delete.confirm')}
    />
  )
}
