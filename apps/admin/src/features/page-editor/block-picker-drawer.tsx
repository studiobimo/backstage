import { useTranslation } from 'react-i18next'

import { Drawer, DrawerPopup, DrawerTitle } from '@/components/ui/drawer'

import { BlockPickerList } from './block-picker-list'
import type { BlockOption } from './draft'

interface BlockPickerDrawerProps {
  open: boolean
  options: BlockOption[]
  onOpenChange: (open: boolean) => void
  onPick: (b: BlockOption) => void
  finalFocus: () => HTMLElement | boolean | null
}

export function BlockPickerDrawer({
  open,
  options,
  onOpenChange,
  onPick,
  finalFocus
}: BlockPickerDrawerProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPopup showBar finalFocus={finalFocus}>
        <DrawerTitle className="sr-only">{t('picker.label')}</DrawerTitle>
        <div className="flex h-[70dvh] min-h-0 touch-auto flex-col px-2 pb-2">
          <BlockPickerList options={options} onPick={onPick} />
        </div>
      </DrawerPopup>
    </Drawer>
  )
}
