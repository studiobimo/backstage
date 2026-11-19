import type { ReactNode } from 'react'

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children
}: ResponsiveDialogProps) {
  const isMobile = useMediaQuery('max-md')
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerPopup showBar>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel className="grid gap-4">{children}</DrawerPanel>
        </DrawerPopup>
      </Drawer>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-4">{children}</DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}
