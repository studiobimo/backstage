import { blockThumbnailUrl } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel
} from '@/components/ui/command'

import { siteOriginQuery } from '../block-preview/queries'
import { useEditingLocale } from '../block-form/locale-status'
import type { BlockOption } from './draft'
import { blockTitle, localizedText } from './localized-text'

interface PickerEntry {
  option: BlockOption
  title: string
  description?: string
  thumbnail?: string
}

const entryText = (item: unknown) => {
  const entry = item as PickerEntry
  return `${entry.title} ${entry.option.name} ${entry.description ?? ''}`
}

function usePickerEntries(options: BlockOption[]): PickerEntry[] {
  const { active, fallback } = useEditingLocale()
  const { data: siteOrigin } = useQuery(siteOriginQuery)
  return options.map((option) => ({
    option,
    title: blockTitle(options, option.name, active, fallback),
    description: localizedText(option.description, active, fallback),
    thumbnail: siteOrigin ? blockThumbnailUrl(siteOrigin, option.name) : undefined
  }))
}

function PickerItem({ entry, onPick }: { entry: PickerEntry; onPick: (b: BlockOption) => void }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  return (
    <CommandItem
      key={entry.option.name}
      value={entry}
      className="items-start gap-3"
      onClick={() => onPick(entry.option)}
    >
      {entry.thumbnail && !thumbnailFailed && (
        <img
          src={entry.thumbnail}
          alt=""
          onError={() => setThumbnailFailed(true)}
          className="h-12 w-16 shrink-0 rounded-md border bg-muted object-cover"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{entry.title}</span>
        {entry.description && (
          <span className="text-muted-foreground text-xs">{entry.description}</span>
        )}
      </span>
    </CommandItem>
  )
}

export function BlockPickerList({
  options,
  onPick
}: {
  options: BlockOption[]
  onPick: (b: BlockOption) => void
}) {
  const { t } = useTranslation('pageEditor')
  const entries = usePickerEntries(options)
  return (
    <Command items={entries} itemToStringValue={entryText}>
      <CommandInput placeholder={t('picker.placeholder')} aria-label={t('picker.label')} />
      <CommandPanel>
        <CommandEmpty>{t('picker.empty')}</CommandEmpty>
        <CommandList>
          {(entry: PickerEntry) => (
            <PickerItem key={entry.option.name} entry={entry} onPick={onPick} />
          )}
        </CommandList>
      </CommandPanel>
    </Command>
  )
}
