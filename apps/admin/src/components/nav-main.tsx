import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, FileText, House, Image, Settings2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
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

const sections: { key: string; icon: LucideIcon; items: string[]; path?: string }[] = [
  { key: 'pages', icon: FileText, items: ['all', 'drafts'], path: '/pages' },
  { key: 'media', icon: Image, items: ['library', 'uploads'] },
  { key: 'settings', icon: Settings2, items: ['general', 'languages'], path: '/settings' }
]

export function NavMain() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
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
        {sections.map(({ key, icon: Icon, items, path }) => (
          <Collapsible
            key={key}
            defaultOpen={path !== undefined && pathname.startsWith(path)}
            render={<SidebarMenuItem />}
          >
            <SidebarMenuButton
              render={<CollapsibleTrigger />}
              tooltip={t(`nav.sections.${key}.title`)}
            >
              <Icon />
              <span>{t(`nav.sections.${key}.title`)}</span>
              <ChevronRight className="ms-auto transition-transform in-data-panel-open:rotate-90" />
            </SidebarMenuButton>
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
