import { PlusIcon } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { CommandDialog, CommandDialogPopup } from '@/components/ui/command'
import { useMediaQuery } from '@/hooks/use-media-query'

import { BlockPickerList } from './block-picker-list'
import type { BlockOption } from './draft'

const BlockPickerDrawer = lazy(async () => ({
  default: (await import('./block-picker-drawer')).BlockPickerDrawer
}))

export function BlockPicker({
  options,
  onPick
}: {
  options: BlockOption[]
  onPick: (b: BlockOption) => void
}) {
  const { t } = useTranslation('pageEditor')
  const isMobile = useMediaQuery('max-md')
  const [open, setOpen] = useState(false)
  const picked = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const show = (next: boolean) => {
    if (next) picked.current = false
    setOpen(next)
  }
  const pick = (option: BlockOption) => {
    picked.current = true
    setOpen(false)
    onPick(option)
  }
  const finalFocus = () => (picked.current ? false : trigger.current)
  return (
    <>
      <Button
        ref={trigger}
        data-picker
        variant="outline"
        disabled={options.length === 0}
        aria-haspopup="dialog"
        onClick={() => show(true)}
      >
        <PlusIcon aria-hidden />
        {t('picker.add')}
      </Button>
      {isMobile ? (
        <Suspense fallback={null}>
          <BlockPickerDrawer
            open={open}
            options={options}
            onOpenChange={show}
            onPick={pick}
            finalFocus={finalFocus}
          />
        </Suspense>
      ) : (
        <CommandDialog open={open} onOpenChange={show}>
          <CommandDialogPopup aria-label={t('picker.label')} finalFocus={finalFocus}>
            <BlockPickerList options={options} onPick={pick} />
          </CommandDialogPopup>
        </CommandDialog>
      )}
    </>
  )
}
