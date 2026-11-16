import type { UseMutationResult } from '@tanstack/react-query'
import { CircleAlertIcon } from 'lucide-react'

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

interface DeleteDialogProps {
  id: string
  remove: UseMutationResult<unknown, Error, string>
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
}

export function DeleteDialog({
  id,
  remove,
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel
}: DeleteDialogProps) {
  const messageOf = useApiErrorMessage()
  const handleOpenChange = (next: boolean) => {
    if (!next) remove.reset()
    onOpenChange(next)
  }
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError && (
          <Alert variant="error">
            <CircleAlertIcon />
            <AlertDescription>{messageOf(remove.error)}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>{cancelLabel}</AlertDialogClose>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id, { onSuccess: () => onOpenChange(false) })}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
