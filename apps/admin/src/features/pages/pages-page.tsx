import { LOCALES, type Page } from '@studiobimo/backstage'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

import { DeletePageDialog } from './delete-page-dialog'
import { pageLabel, pageSlugLabel } from './page-label'
import { PageFormSheet } from './page-form-sheet'
import { pagesQuery } from './queries'

type Editing = { kind: 'create' } | { kind: 'rename' | 'delete'; page: Page }

function PageRow({ page, onAction }: { page: Page; onAction: (editing: Editing) => void }) {
  const { t, i18n } = useTranslation('pages')
  const name = pageLabel(page, i18n.language)
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-center gap-2 font-medium">
          <span className="truncate">{name}</span>
          {page.isHome && <Badge>{t('list.home')}</Badge>}
        </p>
        <p className="flex flex-wrap gap-x-3 text-muted-foreground text-xs">
          {LOCALES.map((locale) => (
            <span key={locale} className="font-mono">
              {pageSlugLabel(page, locale)}
            </span>
          ))}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t('list.rename', { name })}
        onClick={() => onAction({ kind: 'rename', page })}
      >
        <Pencil />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t('list.delete', { name })}
        onClick={() => onAction({ kind: 'delete', page })}
      >
        <Trash2 />
      </Button>
    </li>
  )
}

export function PagesPage() {
  const { t } = useTranslation('pages')
  const { data: pages } = useSuspenseQuery(pagesQuery)
  const [editing, setEditing] = useState<Editing>()
  const close = () => setEditing(undefined)
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl">{t('title')}</h1>
        <Button onClick={() => setEditing({ kind: 'create' })}>
          <Plus />
          {t('list.create')}
        </Button>
      </div>
      {pages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <PageRow key={page.id} page={page} onAction={setEditing} />
          ))}
        </ul>
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
    </div>
  )
}
