import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { EntriesReorderList } from './entries-reorder-list'
import { EntriesTable } from './entries-table'

interface EntriesBodyProps {
  collection: string
  entries: EntrySummary[]
  reorderable: boolean
  onMove: (entries: readonly EntrySummary[], from: number, to: number) => void
  onDelete: (entry: EntrySummary) => void
}

export function EntriesBody({
  collection,
  entries,
  reorderable,
  onMove,
  onDelete
}: EntriesBodyProps) {
  const { t } = useTranslation('collections')
  if (!reorderable) {
    return <EntriesTable collection={collection} entries={entries} onDelete={onDelete} />
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('reorder.hint')}</p>
      <EntriesReorderList
        collection={collection}
        entries={entries}
        onMove={(from, to) => onMove(entries, from, to)}
      />
    </div>
  )
}
