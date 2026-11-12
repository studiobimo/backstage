import { SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'

import { PAGE_STATUS_FILTERS, type PageStatusFilter } from './page-filters'

interface PagesToolbarProps {
  status: PageStatusFilter
  counts: Record<PageStatusFilter, number>
  query: string
  onStatusChange: (status: PageStatusFilter) => void
  onQueryChange: (query: string) => void
}

export function PagesToolbar({
  status,
  counts,
  query,
  onStatusChange,
  onQueryChange
}: PagesToolbarProps) {
  const { t } = useTranslation('pages')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={status} onValueChange={(value) => onStatusChange(value as PageStatusFilter)}>
        <TabsList aria-label={t('list.filters.status')} className="text-muted-foreground">
          {PAGE_STATUS_FILTERS.map((filter) => (
            <TabsTab key={filter} value={filter}>
              {t(`list.filters.${filter}`)}
              <Badge variant="outline" className="not-in-data-active:text-muted-foreground">
                {counts[filter]}
              </Badge>
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
      <InputGroup className="w-full sm:max-w-64">
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={t('list.filters.searchLabel')}
          placeholder={t('list.filters.searchPlaceholder')}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </InputGroup>
    </div>
  )
}
