import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
import type { BlockValue } from '@/features/block-form/value.ts'
import { blockValue } from '@/features/block-form/value.ts'
import type { SiteBlock } from '@studiobimo/backstage/internal'

import { SettingsSection } from './settings-section'
import { saveSlotMutation, slotsQuery, type SlotView } from './queries'
import { SaveFailedAlert } from './save-failed-alert'
import { StaleAlert } from '../page-editor/stale-alert'
import { SKIPPED } from './use-save-feedback'
import { useSection } from './use-section'

interface PendingReplace {
  block: SlotView['blocks'][number]
  value: BlockValue
  resolve: (confirmed: boolean) => void
}

function ReplaceVariantConfirm({
  pending,
  storedName,
  onConfirm,
  onCancel
}: {
  pending: PendingReplace | undefined
  storedName: string | undefined
  onConfirm: () => void
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
          <Button variant="destructive" onClick={onConfirm}>
            {t('replace.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

function useSlotSection(slot: SlotView, block: SlotView['blocks'][number]) {
  const { t } = useTranslation('settings')
  const save = useMutation(saveSlotMutation(useQueryClient(), slot.name))
  const [pending, setPending] = useState<PendingReplace>()
  const stored = slot.current?.block === block.name ? slot.current.content : undefined
  const replacesOtherVariant = slot.current !== null && slot.current.block !== block.name
  const confirmed = (value: BlockValue) =>
    new Promise<boolean>((resolve) => setPending({ block, value, resolve }))
  const section = useSection({
    id: slot.name,
    title: t(`slots.${slot.name}.title`, { defaultValue: slot.name }),
    schema: block.schema,
    saved: useMemo(() => (stored === undefined ? undefined : blockValue.parse(stored)), [stored]),
    queryKey: slotsQuery.queryKey,
    persist: async (value) => {
      if (replacesOtherVariant && !(await confirmed(value))) return SKIPPED
      return save.mutateAsync({
        block: {
          block: block.name,
          schemaVersion: block.version,
          content: value as SiteBlock['content']
        },
        expectedVersion: slot.version
      })
    }
  })
  const answer = (confirm: boolean) => {
    pending?.resolve(confirm)
    setPending(undefined)
  }
  return { ...section, pending, answer }
}

export function SlotSection({ slot }: { slot: SlotView }) {
  const { t } = useTranslation('settings')
  const [choice, setChoice] = useState(slot.current?.block ?? slot.blocks[0]!.name)
  const block = slot.blocks.find(({ name }) => name === choice) ?? slot.blocks[0]!
  const { form, failed, stale, reload, generation, pending, answer } = useSlotSection(slot, block)
  return (
    <SettingsSection
      title={t(`slots.${slot.name}.title`, { defaultValue: slot.name })}
      description={t(`slots.${slot.name}.description`, { defaultValue: '' })}
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
        className="max-w-none gap-8"
        {...form}
      />
      <ReplaceVariantConfirm
        pending={pending}
        storedName={slot.current?.block}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      />
    </SettingsSection>
  )
}
