import { Link, useMatch, useMatches } from '@tanstack/react-router'
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
import { CONTENT_WIDTH, type ContentWidth, DEFAULT_CONTENT_WIDTH } from '@/lib/content-width'
import { useCollectionScreen } from '@/features/collections/use-collection-screen'
import { useDocumentTitle, useScreenTitle } from '@/lib/screen-title'
import { ariaKeyShortcuts } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

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

function PageBreadcrumb() {
  const { t } = useTranslation()
  const title = useScreenTitle()
  const editing = useMatch({ from: '/pages_/$pageId', shouldThrow: false })
  const collection = useCollectionScreen()
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {editing && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/pages" />}>
                {t('nav.sections.pages.title')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {collection?.entry !== undefined && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to="/collections/$name" params={{ name: collection.name }} />}
              >
                {collection.list}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

interface ContentColumnProps {
  className?: string
  width?: ContentWidth
  children: ReactNode
}

function ContentColumn({ className, width: fixedWidth, children }: ContentColumnProps) {
  const routeWidth = useMatches({
    select: (matches) => matches.at(-1)?.staticData.width ?? DEFAULT_CONTENT_WIDTH
  })
  const width = fixedWidth ?? routeWidth
  return (
    <div className={cn('w-full px-gutter sm:px-8', className)}>
      <div className={cn('w-full', CONTENT_WIDTH[width])}>{children}</div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  useDocumentTitle()
  return (
    <ToastProvider position="top-center">
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
            <div className="scroll-fade scroll-fade-10 flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
              <ContentColumn width="wide">
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
