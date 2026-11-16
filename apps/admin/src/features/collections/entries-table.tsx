import type { EntrySummary } from '@studiobimo/backstage/internal'
import { Link, useNavigate } from '@tanstack/react-router'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CardTable } from '@/components/card-table'
import { PublishStateBadge } from '@/components/publish-state-badge'
import type { RowAction } from '@/components/row-action'
import { RowMenu } from '@/components/row-menu'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { useLocaleConfig } from '@/features/config/queries'
import { formatDateTime } from '@/lib/format'

import { entryLabelText } from './collection-text'
import { ENTRY_STATE, entryState } from './entry-filters'

const UPDATED_COLUMN = 'hidden md:table-cell'

interface EntriesTableProps {
  collection: string
  entries: EntrySummary[]
  onDelete: (entry: EntrySummary) => void
}

function useEntryName(entry: EntrySummary) {
  const { t, i18n } = useTranslation('collections')
  const { defaultLocale } = useLocaleConfig()
  return entryLabelText(entry.label, i18n.language, defaultLocale) || t('list.untitled')
}

function StateBadge({ entry }: { entry: EntrySummary }) {
  const { t } = useTranslation('collections')
  const state = entryState(entry)
  return (
    <PublishStateBadge
      published={state !== ENTRY_STATE.draft}
      changed={state === ENTRY_STATE.changed}
      labels={{
        published: t('list.published'),
        changed: t('list.changed'),
        draft: t('list.draft')
      }}
    />
  )
}

function EntryActions({
  collection,
  entry,
  name,
  onDelete
}: {
  collection: string
  entry: EntrySummary
  name: string
  onDelete: (entry: EntrySummary) => void
}) {
  const { t } = useTranslation('collections')
  const navigate = useNavigate()
  const actions: RowAction[] = [
    {
      key: 'edit',
      icon: PencilIcon,
      label: t('list.actions.edit'),
      destructive: false,
      run: () =>
        void navigate({
          to: '/collections/$name/$entryId',
          params: { name: collection, entryId: entry.id }
        })
    },
    {
      key: 'delete',
      icon: Trash2Icon,
      label: t('list.actions.delete'),
      destructive: true,
      run: () => onDelete(entry)
    }
  ]
  return <RowMenu triggerLabel={t('list.actions.open', { name })} actions={actions} />
}

function EntryRow({
  collection,
  entry,
  onDelete
}: {
  collection: string
  entry: EntrySummary
  onDelete: (entry: EntrySummary) => void
}) {
  const { i18n } = useTranslation('collections')
  const name = useEntryName(entry)
  return (
    <TableRow>
      <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-none">
        <Link
          to="/collections/$name/$entryId"
          params={{ name: collection, entryId: entry.id }}
          className="block truncate rounded-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {name}
        </Link>
      </TableCell>
      <TableCell>
        <StateBadge entry={entry} />
      </TableCell>
      <TableCell className={`${UPDATED_COLUMN} text-muted-foreground`}>
        {formatDateTime(i18n.language, entry.updatedAt)}
      </TableCell>
      <TableCell className="w-px">
        <EntryActions collection={collection} entry={entry} name={name} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  )
}

export function EntriesTable({ collection, entries, onDelete }: EntriesTableProps) {
  const { t } = useTranslation('collections')
  return (
    <CardTable
      head={
        <>
          <TableHead>{t('list.columns.label')}</TableHead>
          <TableHead>{t('list.columns.status')}</TableHead>
          <TableHead className={UPDATED_COLUMN}>{t('list.columns.updated')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('list.columns.actions')}</span>
          </TableHead>
        </>
      }
    >
      {entries.map((entry) => (
        <EntryRow key={entry.id} collection={collection} entry={entry} onDelete={onDelete} />
      ))}
    </CardTable>
  )
}
