import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PanelBottomIcon, PanelTopIcon, PanelsTopLeftIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChoiceSelect } from '@/components/choice-select'
import { BlockForm } from '@/features/block-form/block-form.tsx'
import { SectionFrame } from '@/features/block-form/section-frame.tsx'
import type { BlockValue } from '@/features/block-form/value.ts'
import { blockValue } from '@/features/block-form/value.ts'
import { LOCALES, SLOT, type SiteBlock } from '@studiobimo/backstage'

import { saveSlotMutation, type SlotView } from './queries'
import { SaveFailedAlert } from './save-failed-alert'
import { useSaveFeedback } from './use-save-feedback'

const SLOT_ICONS: Record<string, ReactNode> = {
  [SLOT.header]: <PanelTopIcon />,
  [SLOT.footer]: <PanelBottomIcon />
}

function useSaveSlot(slot: SlotView) {
  const save = useMutation(saveSlotMutation(useQueryClient(), slot.name))
  return useSaveFeedback(
    async ({ block, value }: { block: SlotView['blocks'][number]; value: BlockValue }) =>
      save.mutateAsync({
        block: block.name,
        schemaVersion: block.version,
        content: value as SiteBlock['content']
      })
  )
}

export function SlotSection({ slot }: { slot: SlotView }) {
  const { t } = useTranslation('settings')
  const [choice, setChoice] = useState(slot.current?.block ?? slot.blocks[0]!.name)
  const { submit, failed, issues } = useSaveSlot(slot)
  const block = slot.blocks.find(({ name }) => name === choice) ?? slot.blocks[0]!
  const stored = slot.current?.block === block.name ? slot.current.content : undefined
  return (
    <SectionFrame
      id={slot.name}
      title={t(`slots.${slot.name}.title`, { defaultValue: slot.name })}
      description={t(`slots.${slot.name}.description`, { defaultValue: '' })}
      icon={SLOT_ICONS[slot.name] ?? <PanelsTopLeftIcon />}
    >
      {slot.blocks.length > 1 && (
        <ChoiceSelect
          label={t('variant.label')}
          description={t('variant.description')}
          value={block.name}
          options={slot.blocks.map(({ name }) => ({ value: name, label: name }))}
          onChange={setChoice}
        />
      )}
      {failed && <SaveFailedAlert />}
      <BlockForm
        key={block.name}
        schema={block.schema}
        locales={LOCALES}
        value={stored === undefined ? undefined : blockValue.parse(stored)}
        onSubmit={(value) => submit({ block, value })}
        issues={issues}
        className="max-w-none gap-8"
      />
    </SectionFrame>
  )
}
