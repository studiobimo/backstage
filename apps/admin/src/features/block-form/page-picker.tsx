import type { PageSummary } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { pageLabel } from '@/features/pages/page-label.ts'
import { pagesQuery } from '@/features/pages/queries.ts'

import { useEditingLocale } from './locale-status.ts'

interface PageOption {
  page: PageSummary
  label: string
}

const optionsOf = (pages: readonly PageSummary[], language: string): PageOption[] =>
  pages.map((page) => ({ page, label: pageLabel(page, language) || page.id }))

interface PagePickerProps {
  pageId: string
  label: string
  onChange: (pageId: string) => void
}

export function PagePicker({ pageId, label, onChange }: PagePickerProps) {
  const { t } = useTranslation('blockForm')
  const { active } = useEditingLocale()
  const [open, setOpen] = useState(false)
  const query = useQuery(pagesQuery)
  const options = optionsOf(query.data ?? [], active)
  const chosen = options.find(({ page }) => page.id === pageId)
  const shown = chosen?.label ?? (pageId && !query.isPending ? t('link.missing') : '')
  return (
    <div className="flex flex-col gap-2">
      {query.isError && (
        <p role="alert" className="text-destructive-foreground text-xs">
          {t('link.loadFailed')}
        </p>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
              aria-label={t('link.pickerLabel', { field: label, page: shown || t('link.choose') })}
            />
          }
        >
          <span className="truncate">{shown || t('link.choose')}</span>
          <ChevronsUpDownIcon aria-hidden className="opacity-60" />
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-80 max-w-full p-0">
          <Command items={options}>
            <CommandInput placeholder={t('link.search')} aria-label={t('link.search')} />
            <CommandPanel>
              <CommandEmpty>{t('link.empty')}</CommandEmpty>
              <CommandList>
                {(option: PageOption) => (
                  <CommandItem
                    key={option.page.id}
                    value={option.label}
                    onClick={() => {
                      onChange(option.page.id)
                      setOpen(false)
                    }}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {!option.page.publishedAt && (
                      <Badge variant="warning">{t('link.unpublished')}</Badge>
                    )}
                  </CommandItem>
                )}
              </CommandList>
            </CommandPanel>
          </Command>
        </PopoverPopup>
      </Popover>
      {chosen && !chosen.page.publishedAt && (
        <p role="status" className="text-muted-foreground text-xs">
          {t('link.unpublishedHint')}
        </p>
      )}
    </div>
  )
}
