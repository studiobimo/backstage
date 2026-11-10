import { useQuery } from '@tanstack/react-query'
import { Link, useMatch, useMatches, useRouterState } from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import { ShortcutTooltip } from '@/components/shortcut-hint'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { pageLabel } from '@/features/pages/page-label'
import { pagesQuery } from '@/features/pages/queries'
import { CONTENT_WIDTH, DEFAULT_CONTENT_WIDTH } from '@/lib/content-width'
import { ariaKeyShortcuts } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/type': 'nav.type',
  '/pages': 'nav.sections.pages.title',
  '/settings': 'nav.sections.settings.title'
}

function SidebarToggle() {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()
  return (
    <ShortcutTooltip id="toggleSidebar" label={t('nav.toggle')}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('nav.toggle')}
        aria-keyshortcuts={ariaKeyShortcuts('toggleSidebar')}
        onClick={toggleSidebar}
      >
        <PanelLeft />
      </Button>
    </ShortcutTooltip>
  )
}

function EditedPageCrumbs({ pageId }: { pageId: string }) {
  const { t, i18n } = useTranslation()
  const { data: pages } = useQuery(pagesQuery)
  const page = pages?.find((candidate) => candidate.id === pageId)
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Link to="/pages" />}>
          {t('nav.sections.pages.title')}
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>
          {page ? pageLabel(page, i18n.language) : t('title', { ns: 'pageEditor' })}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

function PageBreadcrumb() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const editing = useMatch({ from: '/pages_/$pageId', shouldThrow: false })
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {editing ? (
          <EditedPageCrumbs pageId={editing.params.pageId} />
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{t(pageTitles[pathname] ?? 'nav.home')}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function ContentColumn({ className, children }: { className?: string; children: ReactNode }) {
  const width = useMatches({
    select: (matches) => matches.at(-1)?.staticData.width ?? DEFAULT_CONTENT_WIDTH
  })
  return (
    <div className={cn('w-full px-gutter sm:px-8', className)}>
      <div className={cn('w-full', CONTENT_WIDTH[width])}>{children}</div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider position="top-center">
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
            <div className="scroll-fade scroll-fade-10 flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
              <ContentColumn>
                <header className="flex h-16 shrink-0 items-center gap-2">
                  <SidebarToggle />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <PageBreadcrumb />
                  <CommandPalette />
                </header>
              </ContentColumn>
              <ContentColumn className="flex-1 pb-10">
                <div className="flex w-full flex-col gap-8">{children}</div>
              </ContentColumn>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ToastProvider>
  )
}
