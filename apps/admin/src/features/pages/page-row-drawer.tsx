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

import { actionVariant, type RowAction } from './page-row-actions'

interface PageRowDrawerProps {
  triggerLabel: string
  actions: RowAction[]
}

export function PageRowDrawer({ triggerLabel, actions }: PageRowDrawerProps) {
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
