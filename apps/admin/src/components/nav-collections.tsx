import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { LibraryIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { collectionTitle } from '@/features/collections/collection-text'
import { collectionsQuery } from '@/features/collections/queries'
import { configQuery } from '@/features/config/queries'

export function NavCollections() {
  const { t, i18n } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: collections = [] } = useQuery(collectionsQuery)
  const { data: config } = useQuery(configQuery)
  if (collections.length === 0) return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.groups.collections')}</SidebarGroupLabel>
      <SidebarMenu>
        {collections.map((collection) => {
          const title = collectionTitle(collection, i18n.language, config?.defaultLocale ?? '')
          const path = `/collections/${collection.name}`
          return (
            <SidebarMenuItem key={collection.name}>
              <SidebarMenuButton
                render={<Link to="/collections/$name" params={{ name: collection.name }} />}
                isActive={pathname === path || pathname.startsWith(`${path}/`)}
                tooltip={title}
              >
                <LibraryIcon />
                <span>{title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
