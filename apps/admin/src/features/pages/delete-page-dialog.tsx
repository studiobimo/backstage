import type { Page } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('delete.title', { name: pageLabel(page, i18n.language) })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('form.cancel')}
          </AlertDialogClose>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(page.id, { onSuccess: () => onOpenChange(false) })}
          >
            {t('delete.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
