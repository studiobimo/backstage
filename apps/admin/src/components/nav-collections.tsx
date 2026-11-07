import {
  Folder,
  MoreHorizontal,
  Newspaper,
  Trash2,
  Users,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'

// Placeholders until collections exist (M4).
const collections: { key: string; icon: LucideIcon }[] = [
  { key: 'journal', icon: Newspaper },
  { key: 'team', icon: Users },
  { key: 'services', icon: Wrench }
]

export function NavCollections() {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{t('nav.groups.collections')}</SidebarGroupLabel>
      <SidebarMenu>
        {collections.map(({ key, icon: Icon }) => (
          <SidebarMenuItem key={key}>
            <SidebarMenuButton render={<button type="button" />}>
              <Icon />
              <span>{t(`nav.collections.${key}`)}</span>
            </SidebarMenuButton>
            <Menu>
              <MenuTrigger render={<SidebarMenuAction showOnHover />}>
                <MoreHorizontal />
                <span className="sr-only">
                  {t('nav.more', { name: t(`nav.collections.${key}`) })}
                </span>
              </MenuTrigger>
              <MenuPopup className="w-48" side={isMobile ? 'bottom' : 'right'} align="start">
                <MenuItem>
                  <Folder />
                  <span>{t('nav.open')}</span>
                </MenuItem>
                <MenuSeparator />
                <MenuItem variant="destructive">
                  <Trash2 />
                  <span>{t('nav.delete')}</span>
                </MenuItem>
              </MenuPopup>
            </Menu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
