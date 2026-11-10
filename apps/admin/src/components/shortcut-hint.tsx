import type { ReactElement } from 'react'

import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'
import { type ShortcutId, shortcutKeys } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

const KEYBOARD_ONLY = 'hidden pointer-fine:inline-flex'

interface ShortcutHintProps {
  id: ShortcutId
  className?: string
}

export function ShortcutHint({ id, className }: ShortcutHintProps) {
  return (
    <KbdGroup aria-hidden className={cn(KEYBOARD_ONLY, className)}>
      {shortcutKeys(id).map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  )
}

interface ShortcutTooltipProps {
  id: ShortcutId
  label: string
  children: ReactElement
}

export function ShortcutTooltip({ id, label, children }: ShortcutTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipPopup className="items-center gap-2">
        {label}
        <ShortcutHint id={id} className="-me-1" />
      </TooltipPopup>
    </Tooltip>
  )
}
