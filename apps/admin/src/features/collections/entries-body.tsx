import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { EntriesReorderList } from './entries-reorder-list'
import { EntriesTable } from './entries-table'
import type { EntryToggleControl } from './use-entry-toggle'

interface EntriesBodyProps {
  collection: string
  entries: EntrySummary[]
  reorderable: boolean
  toggle: EntryToggleControl
  onMove: (entries: readonly EntrySummary[], from: number, to: number) => void
  onDelete: (entry: EntrySummary) => void
}

export function EntriesBody({
  collection,
  entries,
  reorderable,
  toggle,
  onMove,
  onDelete
}: EntriesBodyProps) {
  const { t } = useTranslation('collections')
  if (!reorderable) {
    return (
      <EntriesTable collection={collection} entries={entries} toggle={toggle} onDelete={onDelete} />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('reorder.hint')}</p>
      <EntriesReorderList
        collection={collection}
        entries={entries}
        toggle={toggle}
        onMove={(from, to) => onMove(entries, from, to)}
      />
    </div>
  )
}
