import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PanelBottomIcon, PanelTopIcon, PanelsTopLeftIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChoiceSelect } from '@/components/choice-select'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { BlockForm } from '@/features/block-form/block-form.tsx'
import { SectionFrame } from '@/features/block-form/section-frame.tsx'
import type { BlockValue } from '@/features/block-form/value.ts'
import { blockValue } from '@/features/block-form/value.ts'
import { LOCALES, SLOT, type SiteBlock } from '@studiobimo/backstage'

import { saveSlotMutation, slotsQuery, type SlotView } from './queries'
import { SaveFailedAlert } from './save-failed-alert'
import { useSectionDirty, type ReportDirty } from './use-dirty-sections'
import { StaleAlert } from '../page-editor/stale-alert'
import { useReloadLatest, useSaveFeedback } from './use-save-feedback'

const SLOT_ICONS: Record<string, ReactNode> = {
  [SLOT.header]: <PanelTopIcon />,
  [SLOT.footer]: <PanelBottomIcon />
}

function useSaveSlot(slot: SlotView) {
  const save = useMutation(saveSlotMutation(useQueryClient(), slot.name))
  return useSaveFeedback(
    async ({ block, value }: { block: SlotView['blocks'][number]; value: BlockValue }) =>
      save.mutateAsync({
        block: {
          block: block.name,
          schemaVersion: block.version,
          content: value as SiteBlock['content']
        },
        expectedVersion: slot.version
      })
  )
}

type SlotSave = Parameters<ReturnType<typeof useSaveSlot>['submit']>[0]

function ReplaceVariantConfirm({
  pending,
  storedName,
  onConfirm,
  onCancel
}: {
  pending: SlotSave | undefined
  storedName: string | undefined
  onConfirm: (save: SlotSave) => void
  onCancel: () => void
}) {
  const { t } = useTranslation('settings')
  return (
    <AlertDialog open={pending !== undefined} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('replace.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('replace.description', { stored: storedName, chosen: pending?.block.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('replace.cancel')}
          </AlertDialogClose>
          <Button variant="destructive" onClick={() => pending && onConfirm(pending)}>
            {t('replace.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

export function SlotSection({ slot, reportDirty }: { slot: SlotView; reportDirty: ReportDirty }) {
  const { t } = useTranslation('settings')
  const [choice, setChoice] = useState(slot.current?.block ?? slot.blocks[0]!.name)
  const [pending, setPending] = useState<SlotSave>()
  const { submit, failed, stale, issues, clearStale } = useSaveSlot(slot)
  const { generation, reload } = useReloadLatest(slotsQuery.queryKey, clearStale)
  const onDirtyChange = useSectionDirty(slot.name, reportDirty)
  const block = slot.blocks.find(({ name }) => name === choice) ?? slot.blocks[0]!
  const stored = slot.current?.block === block.name ? slot.current.content : undefined
  const replacesOtherVariant = slot.current !== null && slot.current.block !== block.name
  const requestSave = (save: SlotSave) => (replacesOtherVariant ? setPending(save) : submit(save))
  const confirmSave = (save: SlotSave) => {
    setPending(undefined)
    return submit(save)
  }
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
      {stale && <StaleAlert scope="settings" current={stale.current} onReload={reload} />}
      <BlockForm
        key={`${block.name}-${generation}`}
        schema={block.schema}
        locales={LOCALES}
        value={stored === undefined ? undefined : blockValue.parse(stored)}
        onSubmit={(value) => requestSave({ block, value })}
        onDirtyChange={onDirtyChange}
        issues={issues}
        className="max-w-none gap-8"
      />
      <ReplaceVariantConfirm
        pending={pending}
        storedName={slot.current?.block}
        onConfirm={(save) => void confirmSave(save)}
        onCancel={() => setPending(undefined)}
      />
    </SectionFrame>
  )
}
