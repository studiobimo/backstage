import { KV_LIMITS, type EntrySummary } from '@studiobimo/backstage/internal'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

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
import { Switch } from '@/components/ui/switch'

import { republishStatusQuery } from '../pages/republish-queries'
import { entryRun } from '../pages/republish-run'
import { toggleKey, type EntryToggleControl, type ToggleField } from './use-entry-toggle'

interface EntryToggleSwitchProps {
  control: EntryToggleControl
  entry: EntrySummary
  field: ToggleField
  name: string
}

export function EntryToggleSwitch({ control, entry, field, name }: EntryToggleSwitchProps) {
  const { t } = useTranslation('collections')
  return (
    <Switch
      className="relative"
      checked={entry.toggles[field.key] === true}
      disabled={control.pendingKey === toggleKey(entry.id, field.key)}
      aria-label={t('toggle.switchLabel', { field: field.label, name })}
      onCheckedChange={(value) => control.request(entry, field, value)}
    />
  )
}

export function EntryToggleSwitches({
  control,
  entry,
  name
}: Omit<EntryToggleSwitchProps, 'field'>) {
  return control.fields.map((field) => (
    <EntryToggleSwitch key={field.key} control={control} entry={entry} field={field} name={name} />
  ))
}

function useToggleCost(collection: string, entry: EntrySummary | undefined) {
  const scope = entryRun({ collection, entryId: entry?.id })
  return useQuery(republishStatusQuery(scope, entry?.publishedAt != null)).data
}

export function EntryToggleCostDialog({
  collection,
  control
}: {
  collection: string
  control: EntryToggleControl
}) {
  const { t } = useTranslation('collections')
  const status = useToggleCost(collection, control.asking?.entry)
  const limit = KV_LIMITS.freePlanWritesPerDay
  const cost =
    status && status.remaining > 0
      ? t('toggle.confirm.cost', { count: status.remaining, writes: status.writes })
      : t('toggle.confirm.noPages')
  return (
    <AlertDialog open={control.asking !== null} onOpenChange={(open) => !open && control.dismiss()}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('toggle.confirm.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('toggle.confirm.description')} {cost} {t('toggle.confirm.limit', { limit })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('toggle.confirm.cancel')}
          </AlertDialogClose>
          <Button onClick={control.confirm}>{t('toggle.confirm.confirm')}</Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
