import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { ListPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IconButton } from '@/components/icon-button'
import type { SortableSlot } from '@/components/sortable-items'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel
} from '@/components/ui/command'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { EntryKey } from '../collections/entry-key.tsx'
import { useEditingLocale } from './locale-status.ts'
import { entryLabelOf, referenceEntriesQuery } from './reference-queries.ts'

const SortableItems = lazy(() => import('@/components/sortable-items'))

interface ChosenEntriesProps {
  collection: string
  ids: string[]
  max: number
  onChange: (ids: string[]) => void
}

interface PickerOption {
  entry: EntrySummary
  label: string
}

interface Row {
  id: string
  name: string
  entry: EntrySummary | undefined
}

function useRows(collection: string, ids: readonly string[]) {
  const { t } = useTranslation('blockForm')
  const { active, fallback } = useEditingLocale()
  const query = useQuery(referenceEntriesQuery(collection))
  const byId = new Map((query.data ?? []).map((entry) => [entry.id, entry]))
  const rows: Row[] = ids.map((id) => {
    const entry = byId.get(id)
    const name = entry ? entryLabelOf(entry, active, fallback) : ''
    return { id, entry, name: name || (query.isPending ? id : t('reference.missing')) }
  })
  const options = (query.data ?? []).map((entry) => ({
    entry,
    label: entryLabelOf(entry, active, fallback) || entry.id
  }))
  return { rows, options, query }
}

function EntryRow({
  row,
  slot,
  onRemove
}: {
  row: Row
  slot?: SortableSlot
  onRemove: () => void
}) {
  const { t } = useTranslation('blockForm')
  return (
    <li
      ref={slot?.ref}
      className={cn(
        'flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs/5 not-dark:bg-clip-padding',
        slot?.dragging && 'z-10 shadow-lg ring-2 ring-ring/24'
      )}
    >
      {slot?.handle}
      <span className="min-w-0 flex-1 truncate px-2 font-medium text-sm">{row.name}</span>
      {row.entry && <EntryKey entry={row.entry} />}
      {row.entry && !row.entry.publishedAt && (
        <Badge variant="warning">{t('reference.unpublished')}</Badge>
      )}
      {!row.entry && <Badge variant="error">{t('reference.missing')}</Badge>}
      <IconButton
        label={t('reference.remove', { item: row.name })}
        variant="ghost"
        onClick={onRemove}
      >
        <Trash2Icon />
      </IconButton>
    </li>
  )
}

function EntryPicker({
  options,
  disabled,
  onPick
}: {
  options: PickerOption[]
  disabled: boolean
  onPick: (id: string) => void
}) {
  const { t } = useTranslation('blockForm')
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}
      >
        <PlusIcon aria-hidden />
        {t('reference.add')}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-80 max-w-full p-0">
        <Command items={options}>
          <CommandInput placeholder={t('reference.search')} aria-label={t('reference.search')} />
          <CommandPanel>
            <CommandEmpty>{t('reference.empty')}</CommandEmpty>
            <CommandList>
              {(option: PickerOption) => (
                <CommandItem
                  key={option.entry.id}
                  value={[option.label, option.entry.key].filter(Boolean).join(' ')}
                  onClick={() => {
                    onPick(option.entry.id)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  <EntryKey entry={option.entry} />
                  {!option.entry.publishedAt && (
                    <Badge variant="warning">{t('reference.unpublished')}</Badge>
                  )}
                </CommandItem>
              )}
            </CommandList>
          </CommandPanel>
        </Command>
      </PopoverPopup>
    </Popover>
  )
}

export function ChosenEntries({ collection, ids, max, onChange }: ChosenEntriesProps) {
  const { t } = useTranslation('blockForm')
  const { rows, options, query } = useRows(collection, ids)
  const remove = (id: string) => onChange(ids.filter((current) => current !== id))
  const move = (from: number, to: number) => {
    const next = [...ids]
    next.splice(to, 0, ...next.splice(from, 1))
    onChange(next)
  }
  const available = options.filter(({ entry }) => !ids.includes(entry.id))
  const renderRow = (key: string, index: number, slot?: SortableSlot) => (
    <EntryRow key={key} row={rows[index]!} slot={slot} onRemove={() => remove(key)} />
  )
  return (
    <div className="flex flex-col gap-3">
      {query.isError && (
        <p role="alert" className="text-destructive-foreground text-xs">
          {t('reference.loadFailed')}
        </p>
      )}
      {rows.length === 0 ? (
        <Empty className="w-full gap-2 rounded-lg border border-dashed p-5 md:p-5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListPlusIcon />
            </EmptyMedia>
            <EmptyTitle className="font-sans font-medium text-sm">{t('reference.none')}</EmptyTitle>
            <EmptyDescription>{t('reference.noneDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Suspense
          fallback={
            <ul className="flex flex-col gap-2">
              {rows.map(({ id }, index) => renderRow(id, index))}
            </ul>
          }
        >
          <SortableItems keys={ids} names={rows.map(({ name }) => name)} onMove={move}>
            {renderRow}
          </SortableItems>
        </Suspense>
      )}
      <div className="flex items-center gap-3">
        <EntryPicker
          options={available}
          disabled={ids.length >= max}
          onPick={(id) => onChange([...ids, id])}
        />
        <span className="text-muted-foreground text-xs">
          {t('reference.count', { count: ids.length })}
        </span>
      </div>
    </div>
  )
}
