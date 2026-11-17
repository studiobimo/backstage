import type { ReactNode } from 'react'

import { PageTitle } from '@/components/page-title'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <PageTitle>{title}</PageTitle>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
