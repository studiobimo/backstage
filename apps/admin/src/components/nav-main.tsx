import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, FileText, Image, Settings2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useIsOwner } from '@/features/users/queries'
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

type SectionPath = '/pages' | '/media' | '/settings' | '/settings/users'

interface NavSectionItem {
  key: string
  path: SectionPath
}

export interface NavSectionDefinition {
  key: string
  icon: LucideIcon
  path: SectionPath
  items: NavSectionItem[]
}

const sectionsFor = (isOwner: boolean): NavSectionDefinition[] => [
  { key: 'pages', icon: FileText, path: '/pages', items: [{ key: 'all', path: '/pages' }] },
  { key: 'media', icon: Image, path: '/media', items: [{ key: 'uploads', path: '/media' }] },
  {
    key: 'settings',
    icon: Settings2,
    path: '/settings',
    items: [
      { key: 'general', path: '/settings' },
      ...(isOwner ? [{ key: 'users', path: '/settings/users' as const }] : [])
    ]
  }
]

function isWithin(pathname: string, path: SectionPath) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function activeItemPath(pathname: string, items: NavSectionItem[]) {
  return items
    .filter((item) => isWithin(pathname, item.path))
    .reduce<SectionPath | null>(
      (best, item) => (best === null || item.path.length > best.length ? item.path : best),
      null
    )
}

export function NavSection({
  section,
  pathname
}: {
  section: NavSectionDefinition
  pathname: string
}) {
  const { t } = useTranslation()
  const { key, icon: Icon, path, items } = section
  const title = t(`nav.sections.${key}.title`)
  const active = isWithin(pathname, path)
  const activeItem = activeItemPath(pathname, items)

  if (items.length <= 1) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link to={path} />} isActive={active} tooltip={title}>
          <Icon />
          <span>{title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible defaultOpen={active} render={<SidebarMenuItem />}>
      <SidebarMenuButton render={<CollapsibleTrigger />} isActive={active} tooltip={title}>
        <Icon />
        <span>{title}</span>
        <ChevronRight className="ms-auto transition-transform in-data-panel-open:rotate-90" />
      </SidebarMenuButton>
      <CollapsiblePanel>
        <SidebarMenuSub>
          {items.map((item) => (
            <SidebarMenuSubItem key={item.key}>
              <SidebarMenuSubButton
                render={<Link to={item.path} />}
                isActive={item.path === activeItem}
              >
                <span>{t(`nav.sections.${key}.items.${item.key}`)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsiblePanel>
    </Collapsible>
  )
}

export function NavMain() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const sections = sectionsFor(useIsOwner())
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.groups.workspace')}</SidebarGroupLabel>
      <SidebarMenu>
        {sections.map((section) => (
          <NavSection key={section.key} section={section} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
