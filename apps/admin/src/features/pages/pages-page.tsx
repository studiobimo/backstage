import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { ShortcutHint, ShortcutTooltip } from '@/components/shortcut-hint'
import { Button } from '@/components/ui/button'
import { ariaKeyShortcuts, useShortcut } from '@/lib/shortcuts'

import { DeletePageDialog } from './delete-page-dialog'
import { countByStatus, filterPages, PAGE_STATUS, type PageStatusFilter } from './page-filters'
import { PageFormSheet } from './page-form-sheet'
import type { PageAction } from './page-row-actions'
import { PagesTable } from './pages-table'
import { PagesToolbar } from './pages-toolbar'
import { RepublishAllDialog } from './republish-dialog'
import { pagesQuery } from './queries'

type Editing = { kind: 'create' } | PageAction

interface PagesPageProps {
  createRequested?: boolean
  onCreateHandled?: () => void
}

export function PagesPage({ createRequested = false, onCreateHandled }: PagesPageProps) {
  const { t } = useTranslation('pages')
  const { data: pages } = useSuspenseQuery(pagesQuery)
  const [editing, setEditing] = useState<Editing>()
  const [status, setStatus] = useState<PageStatusFilter>(PAGE_STATUS.all)
  const [query, setQuery] = useState('')
  const close = () => {
    setEditing(undefined)
    onCreateHandled?.()
  }
  const creating = createRequested || editing?.kind === 'create'
  const startCreate = useCallback(() => setEditing({ kind: 'create' }), [])
  useShortcut('newPage', true, startCreate)
  const visible = filterPages(pages, status, query)
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {pages.some(({ publishedAt }) => publishedAt !== null) && (
              <RepublishAllDialog pages={pages} />
            )}
            <ShortcutTooltip id="newPage" label={t('list.create')}>
              <Button aria-keyshortcuts={ariaKeyShortcuts('newPage')} onClick={startCreate}>
                <Plus />
                {t('list.create')}
                <ShortcutHint id="newPage" className="-me-1" />
              </Button>
            </ShortcutTooltip>
          </div>
        }
      />
      {pages.length === 0 ? (
        <ListNotice title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
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
            <ListNotice title={t('list.noMatchTitle')} description={t('list.noMatchDescription')} />
          ) : (
            <PagesTable pages={visible} onAction={setEditing} />
          )}
        </>
      )}
      <PageFormSheet
        key={editing?.kind === 'rename' ? editing.page.id : 'create'}
        page={editing?.kind === 'rename' ? editing.page : undefined}
        open={creating || editing?.kind === 'rename'}
        onOpenChange={(open) => !open && close()}
      />
      {editing?.kind === 'delete' && (
        <DeletePageDialog page={editing.page} open onOpenChange={(open) => !open && close()} />
      )}
    </>
  )
}
