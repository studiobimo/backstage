import { Link } from '@tanstack/react-router'
import { House } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { site } from '@/config/site'

export function AppSidebar() {
  const { t } = useTranslation()
  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center px-gutter">
        <Link to="/" className="font-heading text-xl">
          {site.name}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label={t('nav.label')}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to="/" activeOptions={{ exact: true }} />}
                  tooltip={t('nav.home')}
                >
                  <House />
                  <span>{t('nav.home')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex-row items-center justify-between">
        <LanguageSwitcher />
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
