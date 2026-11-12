import type { Page } from '@studiobimo/backstage'
import { CircleAlertIcon } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useApiErrorMessage } from '@/lib/api-feedback'

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
  const messageOf = useApiErrorMessage()
  const handleOpenChange = (next: boolean) => {
    if (!next) remove.reset()
    onOpenChange(next)
  }
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('delete.title', { name: pageLabel(page, i18n.language) })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError && (
          <Alert variant="error">
            <CircleAlertIcon />
            <AlertDescription>{messageOf(remove.error)}</AlertDescription>
          </Alert>
        )}
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
