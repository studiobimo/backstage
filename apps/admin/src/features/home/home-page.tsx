import type { PageSummary } from '@studiobimo/backstage/internal'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FilePlusIcon, LayoutListIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DotLogo } from '@/components/dot-logo'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Frame, FrameHeader, FramePanel, FrameTitle } from '@/components/ui/frame'
import { site } from '@/config/site'
import { pageLabel } from '@/features/pages/page-label'
import { StatusBadge } from '@/features/pages/pages-table'
import { useDraftIds } from '@/features/page-editor/unsaved-pages'
import { pagesQuery } from '@/features/pages/queries'
import { formatDateTime } from '@/lib/format'

import { recentPages } from './recent-pages'

function NewPageButton() {
  const { t } = useTranslation('pages')
  return (
    <Button render={<Link to="/pages" search={{ create: true }} />}>
      <FilePlusIcon />
      {t('list.create')}
    </Button>
  )
}

function FirstRun() {
  const { t } = useTranslation('home')
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FilePlusIcon />
        </EmptyMedia>
        <EmptyTitle>{t('empty.title')}</EmptyTitle>
        <EmptyDescription>{t('empty.description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewPageButton />
      </EmptyContent>
    </Empty>
  )
}

function RecentRow({ page, unsaved }: { page: PageSummary; unsaved: boolean }) {
  const { t, i18n } = useTranslation('home')
  const name = pageLabel(page, i18n.language)
  return (
    <FramePanel className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground text-sm">
          {formatDateTime(i18n.language, page.updatedAt)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {unsaved && <Badge variant="warning">{t('recent.unsaved')}</Badge>}
        <StatusBadge page={page} />
        <Button
          variant="outline"
          size="sm"
          aria-label={t('recent.edit', { name })}
          render={<Link to="/pages/$pageId" params={{ pageId: page.id }} />}
        >
          <LayoutListIcon />
          {t('recent.editLabel')}
        </Button>
      </div>
    </FramePanel>
  )
}

function WhereYouLeftOff({ pages }: { pages: PageSummary[] }) {
  const { t } = useTranslation('home')
  const unsavedIds = useDraftIds(pages)
  return (
    <section aria-labelledby="where-you-left-off">
      <Frame>
        <FrameHeader>
          <FrameTitle id="where-you-left-off" role="heading" aria-level={2}>
            {t('recent.title')}
          </FrameTitle>
        </FrameHeader>
        {pages.map((page) => (
          <RecentRow key={page.id} page={page} unsaved={unsavedIds.has(page.id)} />
        ))}
      </Frame>
    </section>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const { data: pages } = useSuspenseQuery(pagesQuery)
  return (
    <>
      <DotLogo text={site.name} />
      <PageHeader
        title={t('home.title', { name: site.name })}
        description={t('home.description')}
      />
      {pages.length === 0 ? <FirstRun /> : <WhereYouLeftOff pages={recentPages(pages)} />}
    </>
  )
}
