import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

import { DeletePageDialog } from './delete-page-dialog'
import { countByStatus, filterPages, PAGE_STATUS, type PageStatusFilter } from './page-filters'
import { PageFormSheet } from './page-form-sheet'
import type { PageAction } from './page-row-actions'
import { PagesTable } from './pages-table'
import { PagesToolbar } from './pages-toolbar'
import { pagesQuery } from './queries'

type Editing = { kind: 'create' } | PageAction

function NoPages({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function PagesPage() {
  const { t } = useTranslation('pages')
  const { data: pages } = useSuspenseQuery(pagesQuery)
  const [editing, setEditing] = useState<Editing>()
  const [status, setStatus] = useState<PageStatusFilter>(PAGE_STATUS.all)
  const [query, setQuery] = useState('')
  const close = () => setEditing(undefined)
  const visible = filterPages(pages, status, query)
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button onClick={() => setEditing({ kind: 'create' })}>
            <Plus />
            {t('list.create')}
          </Button>
        }
      />
      {pages.length === 0 ? (
        <NoPages title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
      ) : (
        <>
          <PagesToolbar
            status={status}
            counts={countByStatus(pages)}
            query={query}
            onStatusChange={setStatus}
            onQueryChange={setQuery}
          />
          {visible.length === 0 ? (
            <NoPages title={t('list.noMatchTitle')} description={t('list.noMatchDescription')} />
          ) : (
            <PagesTable pages={visible} onAction={setEditing} />
          )}
        </>
      )}
      <PageFormSheet
        key={editing?.kind === 'rename' ? editing.page.id : 'create'}
        page={editing?.kind === 'rename' ? editing.page : undefined}
        open={editing?.kind === 'create' || editing?.kind === 'rename'}
        onOpenChange={(open) => !open && close()}
      />
      {editing?.kind === 'delete' && (
        <DeletePageDialog page={editing.page} open onOpenChange={(open) => !open && close()} />
      )}
    </>
  )
}
