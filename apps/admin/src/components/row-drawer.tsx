import { EllipsisIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuItem,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger
} from '@/components/ui/drawer'

import { actionVariant, type RowAction } from './row-action'

interface RowDrawerProps {
  triggerLabel: string
  actions: RowAction[]
}

export function RowDrawer({ triggerLabel, actions }: RowDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger render={<Button size="icon" variant="ghost" aria-label={triggerLabel} />}>
        <EllipsisIcon aria-hidden />
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerPanel>
          <DrawerMenu>
            {actions.map((action) => (
              <DrawerClose
                key={action.key}
                render={<DrawerMenuItem variant={actionVariant(action)} />}
                onClick={action.run}
              >
                <action.icon aria-hidden />
                {action.label}
              </DrawerClose>
            ))}
          </DrawerMenu>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}
