import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ListNotice } from '@/components/list-notice'
import { PageHeader } from '@/components/page-header'
import { ShortcutHint, ShortcutTooltip } from '@/components/shortcut-hint'
import { Button } from '@/components/ui/button'
import { useLocaleConfig } from '@/features/config/queries'
import { ariaKeyShortcuts, useShortcut } from '@/lib/shortcuts'

import { localizedText } from '../page-editor/localized-text'
import { collectionTitle } from './collection-text'
import { DeleteEntryDialog } from './delete-entry-dialog'
import { EntriesBody } from './entries-body'
import { EntryRepublishDialog } from './entry-republish'
import { EntryToggleCostDialog } from './entry-toggle-switch'
import { useEntryReorder } from './use-entry-reorder'
import { toggleFieldsOf, useEntryToggle } from './use-entry-toggle'
import {
  DEFAULT_ENTRY_SORT,
  defaultDirection,
  ENTRY_SORT,
  type EntrySort,
  type SortDirection,
  visibleEntries
} from './entry-filters'
import { EntriesToolbar } from './entries-toolbar'
import { collectionsQuery, entriesQuery } from './queries'

function useListOrdering() {
  const [sort, setSort] = useState<EntrySort>(DEFAULT_ENTRY_SORT.sort)
  const [direction, setDirection] = useState<SortDirection>(DEFAULT_ENTRY_SORT.direction)
  return {
    sort,
    direction,
    changeSort: (next: EntrySort) => {
      setSort(next)
      setDirection(defaultDirection(next))
    },
    setDirection
  }
}

function CreateEntryButton({ name }: { name: string }) {
  const { t } = useTranslation('collections')
  return (
    <ShortcutTooltip id="newPage" label={t('list.create')}>
      <Button
        aria-keyshortcuts={ariaKeyShortcuts('newPage')}
        render={<Link to="/collections/$name/new" params={{ name }} />}
      >
        <Plus />
        {t('list.create')}
        <ShortcutHint id="newPage" className="-me-1" />
      </Button>
    </ShortcutTooltip>
  )
}

export function EntriesPage({ name }: { name: string }) {
  const { t, i18n } = useTranslation('collections')
  const { defaultLocale } = useLocaleConfig()
  const { data: collections } = useSuspenseQuery(collectionsQuery)
  const { data: entries } = useSuspenseQuery(entriesQuery(name))
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<EntrySummary>()
  const ordering = useListOrdering()
  const reorder = useEntryReorder(name)
  const collection = collections.find((candidate) => candidate.name === name)
  const toggle = useEntryToggle(name, collection ? toggleFieldsOf(collection) : [], reorder.outcome)
  const navigate = useNavigate()
  const startCreate = useCallback(
    () => void navigate({ to: '/collections/$name/new', params: { name } }),
    [navigate, name]
  )
  useShortcut('newPage', collection !== undefined, startCreate)
  if (!collection) {
    return <ListNotice title={t('missing.title')} description={t('missing.description')} />
  }
  const title = collectionTitle(collection, i18n.language, defaultLocale)
  const visible = visibleEntries(entries, query, {
    sort: ordering.sort,
    direction: ordering.direction,
    language: i18n.language,
    fallbackLocale: defaultLocale
  })
  return (
    <>
      <PageHeader
        title={title}
        description={localizedText(collection.description, i18n.language, defaultLocale)}
        actions={<CreateEntryButton name={name} />}
      />
      {entries.length === 0 ? (
        <ListNotice title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
      ) : (
        <>
          <EntriesToolbar
            query={query}
            sort={ordering.sort}
            direction={ordering.direction}
            onQueryChange={setQuery}
            onSortChange={ordering.changeSort}
            onDirectionChange={ordering.setDirection}
          />
          {visible.length === 0 ? (
            <ListNotice title={t('list.noMatchTitle')} description={t('list.noMatchDescription')} />
          ) : (
            <EntriesBody
              collection={name}
              entries={visible}
              reorderable={ordering.sort === ENTRY_SORT.manual && query.trim() === ''}
              toggle={toggle}
              onMove={reorder.move}
              onDelete={setDeleting}
            />
          )}
        </>
      )}
      <EntryRepublishDialog
        entry={{ collection: name }}
        pending={reorder.outcome.pending}
        onClose={reorder.outcome.clear}
      />
      <EntryToggleCostDialog collection={name} control={toggle} />
      {deleting && (
        <DeleteEntryDialog
          entry={deleting}
          collection={name}
          open
          onOpenChange={(open) => !open && setDeleting(undefined)}
        />
      )}
    </>
  )
}
