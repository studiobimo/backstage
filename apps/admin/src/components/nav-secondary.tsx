import { Link } from '@tanstack/react-router'
import { BlocksIcon, Type } from 'lucide-react'
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
  if (!import.meta.env.DEV) return null
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link to="/blocks" />}>
              <BlocksIcon />
              <span>{t('nav.blocks')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link to="/type" />}>
              <Type />
              <span>{t('nav.type')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
