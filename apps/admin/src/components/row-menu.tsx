import { EllipsisIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import { useMediaQuery } from '@/hooks/use-media-query'

import { actionVariant, type RowAction } from './row-action'

const RowDrawer = lazy(async () => ({
  default: (await import('./row-drawer')).RowDrawer
}))

interface RowMenuProps {
  triggerLabel: string
  actions: RowAction[]
}

export function RowMenu({ triggerLabel, actions }: RowMenuProps) {
  const isMobile = useMediaQuery('max-md')

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <RowDrawer triggerLabel={triggerLabel} actions={actions} />
      </Suspense>
    )
  }

  return (
    <Menu>
      <MenuTrigger render={<Button size="icon" variant="ghost" aria-label={triggerLabel} />}>
        <EllipsisIcon aria-hidden />
      </MenuTrigger>
      <MenuPopup align="end">
        {actions.map((action) => (
          <MenuItem key={action.key} variant={actionVariant(action)} onClick={action.run}>
            <action.icon aria-hidden />
            {action.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  )
}
