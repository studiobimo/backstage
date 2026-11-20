import type { EntrySummary } from '@studiobimo/backstage/internal'
import { Link } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import type { SortableSlot } from '@/components/sortable-items'
import { useLocaleConfig } from '@/features/config/queries'
import { cn } from '@/lib/utils'

import { entryLabelText } from './collection-text'
import { EntryKey } from './entry-key'
import { EntryToggleSwitches } from './entry-toggle-switch'
import { StateBadge } from './entry-state-badge'
import type { EntryToggleControl } from './use-entry-toggle'

const SortableItems = lazy(() => import('@/components/sortable-items'))

const LIST_CLASS = 'gap-2'

interface ReorderRowProps {
  collection: string
  entry: EntrySummary
  name: string
  toggle: EntryToggleControl
  slot?: SortableSlot
}

function ReorderRow({ collection, entry, name, toggle, slot }: ReorderRowProps) {
  return (
    <li
      ref={slot?.ref}
      className={cn(
        'flex items-center gap-2 rounded-xl border bg-card p-1 pe-3',
        slot?.dragging && 'relative z-10 shadow-lg ring-2 ring-ring/24'
      )}
    >
      {slot?.handle}
      <Link
        to="/collections/$name/$entryId"
        params={{ name: collection, entryId: entry.id }}
        className="min-w-0 flex-1 truncate rounded-sm px-1 py-1.5 font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {name}
      </Link>
      <EntryKey entry={entry} />
      <StateBadge entry={entry} />
      <EntryToggleSwitches control={toggle} entry={entry} name={name} />
    </li>
  )
}

interface EntriesReorderListProps {
  collection: string
  entries: EntrySummary[]
  toggle: EntryToggleControl
  onMove: (from: number, to: number) => void
}

export function EntriesReorderList({
  collection,
  entries,
  toggle,
  onMove
}: EntriesReorderListProps) {
  const { t, i18n } = useTranslation('collections')
  const { defaultLocale } = useLocaleConfig()
  const names = entries.map(
    (entry) => entryLabelText(entry.label, i18n.language, defaultLocale) || t('list.untitled')
  )
  const renderRow = (key: string, index: number, slot?: SortableSlot) => (
    <ReorderRow
      key={key}
      collection={collection}
      entry={entries[index]!}
      name={names[index]!}
      toggle={toggle}
      slot={slot}
    />
  )
  return (
    <Suspense
      fallback={
        <ul className={cn('flex flex-col', LIST_CLASS)}>
          {entries.map((entry, index) => renderRow(entry.id, index))}
        </ul>
      }
    >
      <SortableItems
        className={LIST_CLASS}
        keys={entries.map((entry) => entry.id)}
        names={names}
        onMove={onMove}
      >
        {renderRow}
      </SortableItems>
    </Suspense>
  )
}
