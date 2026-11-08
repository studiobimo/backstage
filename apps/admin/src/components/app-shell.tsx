import { useRouterState } from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppSidebar } from '@/components/app-sidebar'
import { IconButton } from '@/components/icon-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { site } from '@/config/site'

const pageTitles: Record<string, string> = {
  '/type': 'nav.type',
  '/pages': 'nav.sections.pages.title',
  '/settings': 'nav.sections.settings.title'
}

function SidebarToggle() {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()
  return (
    <IconButton variant="ghost" label={t('nav.toggle')} onClick={toggleSidebar}>
      <PanelLeft />
    </IconButton>
  )
}

function PageBreadcrumb() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">{site.name}</BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{t(pageTitles[pathname] ?? 'nav.home')}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider position="top-center">
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 px-gutter">
              <SidebarToggle />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <PageBreadcrumb />
              <div className="ml-auto flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </header>
            <div className="flex-1 px-gutter pb-10 sm:px-8">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">{children}</div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ToastProvider>
  )
}
