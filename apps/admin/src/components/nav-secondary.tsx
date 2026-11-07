import { Link } from '@tanstack/react-router'
import { LifeBuoy, Type } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export function NavSecondary(props: ComponentProps<typeof SidebarGroup>) {
  const { t } = useTranslation()
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link to="/type" />}>
              <Type />
              <span>{t('nav.type')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {/* A placeholder: there is no help to open yet. */}
            <SidebarMenuButton size="sm" render={<button type="button" />}>
              <LifeBuoy />
              <span>{t('nav.support')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
