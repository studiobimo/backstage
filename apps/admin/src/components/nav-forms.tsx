import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { configQuery } from '@/features/config/queries'
import { formTitle } from '@/features/forms/form-text'
import { formsQuery } from '@/features/forms/queries'

export function NavForms() {
  const { t, i18n } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: forms = [] } = useQuery(formsQuery)
  const { data: config } = useQuery(configQuery)
  if (forms.length === 0) return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('nav.groups.forms')}</SidebarGroupLabel>
      <SidebarMenu>
        {forms.map((form) => {
          const title = formTitle(form, i18n.language, config?.defaultLocale ?? '')
          const path = `/forms/${form.name}`
          return (
            <SidebarMenuItem key={form.name}>
              <SidebarMenuButton
                render={<Link to="/forms/$name" params={{ name: form.name }} />}
                isActive={pathname === path || pathname.startsWith(`${path}/`)}
                tooltip={title}
              >
                <InboxIcon />
                <span>{title}</span>
              </SidebarMenuButton>
              {form.newCount > 0 && (
                <SidebarMenuBadge
                  aria-label={t('nav.newCount', { ns: 'forms', count: form.newCount })}
                >
                  {form.newCount}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
