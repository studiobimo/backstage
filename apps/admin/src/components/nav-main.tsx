import { Link } from '@tanstack/react-router'
import { ChevronRight, FileText, House, Image, Settings2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'

const itemRoutes: Record<string, '/pages' | '/settings'> = {
  'pages.all': '/pages',
  'settings.general': '/settings'
}

const sections: { key: string; icon: LucideIcon; items: string[] }[] = [
  { key: 'pages', icon: FileText, items: ['all', 'drafts'] },
  { key: 'media', icon: Image, items: ['library', 'uploads'] },
  { key: 'settings', icon: Settings2, items: ['general', 'languages'] }
]

export function NavMain() {
  const { t } = useTranslation()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.groups.workspace')}</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to="/" activeOptions={{ exact: true }} />}
            tooltip={t('nav.home')}
          >
            <House />
            <span>{t('nav.home')}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {sections.map(({ key, icon: Icon, items }) => (
          <Collapsible key={key} render={<SidebarMenuItem />}>
            <SidebarMenuButton tooltip={t(`nav.sections.${key}.title`)}>
              <Icon />
              <span>{t(`nav.sections.${key}.title`)}</span>
            </SidebarMenuButton>
            <CollapsibleTrigger
              render={<SidebarMenuAction className="data-panel-open:rotate-90" />}
            >
              <ChevronRight />
              <span className="sr-only">
                {t('nav.expand', { name: t(`nav.sections.${key}.title`) })}
              </span>
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <SidebarMenuSub>
                {items.map((item) => (
                  <SidebarMenuSubItem key={item}>
                    <SidebarMenuSubButton
                      render={
                        itemRoutes[`${key}.${item}`] ? (
                          <Link to={itemRoutes[`${key}.${item}`]} />
                        ) : (
                          <button type="button" />
                        )
                      }
                    >
                      <span>{t(`nav.sections.${key}.items.${item}`)}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsiblePanel>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
