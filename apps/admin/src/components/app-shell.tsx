import { PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppSidebar } from '@/components/app-sidebar'
import { IconButton } from '@/components/icon-button'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { site } from '@/config/site'

function SidebarToggle() {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()
  return (
    <IconButton variant="ghost" label={t('nav.toggle')} onClick={toggleSidebar}>
      <PanelLeft />
    </IconButton>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-gutter">
            <SidebarToggle />
            <span className="font-heading text-xl md:hidden">{site.name}</span>
          </header>
          {/* SidebarInset is the page's <main>, so this is not a second one. */}
          <div className="flex-1 p-gutter">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
