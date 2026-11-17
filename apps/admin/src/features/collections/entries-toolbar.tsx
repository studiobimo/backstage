import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconButton } from '@/components/icon-button'
import { SearchField } from '@/components/search-field'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'

import { ENTRY_SORTS, type EntrySort, SORT_DIRECTION, type SortDirection } from './entry-filters'
import { CONTROL_WIDTH } from '@/lib/content-width'

interface EntriesToolbarProps {
  query: string
  sort: EntrySort
  direction: SortDirection
  onQueryChange: (query: string) => void
  onSortChange: (sort: EntrySort) => void
  onDirectionChange: (direction: SortDirection) => void
}

export function EntriesToolbar({
  query,
  sort,
  direction,
  onQueryChange,
  onSortChange,
  onDirectionChange
}: EntriesToolbarProps) {
  const { t } = useTranslation('collections')
  const ascending = direction === SORT_DIRECTION.ascending
  const options = ENTRY_SORTS.map((value) => ({ value, label: t(`list.sort.options.${value}`) }))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SearchField
        label={t('list.searchLabel')}
        placeholder={t('list.searchPlaceholder')}
        value={query}
        onChange={onQueryChange}
      />
      <div className="flex items-center gap-2">
        <Select
          items={options}
          value={sort}
          onValueChange={(next: string | null) => next !== null && onSortChange(next as EntrySort)}
        >
          <SelectTrigger aria-label={t('list.sort.label')} className={CONTROL_WIDTH.compact}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <IconButton
          variant="outline"
          label={t(ascending ? 'list.sort.ascending' : 'list.sort.descending')}
          onClick={() =>
            onDirectionChange(ascending ? SORT_DIRECTION.descending : SORT_DIRECTION.ascending)
          }
        >
          {ascending ? <ArrowUpIcon aria-hidden /> : <ArrowDownIcon aria-hidden />}
        </IconButton>
      </div>
    </div>
  )
}
