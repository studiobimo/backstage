import { LOCALES, siteSettingsJsonSchema, siteSettingsSchema } from '@studiobimo/backstage'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { GlobeIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { LeaveGuard } from '@/components/leave-guard'
import { PageHeader } from '@/components/page-header'
import { BlockForm } from '@/features/block-form/block-form.tsx'
import { SectionFrame } from '@/features/block-form/section-frame.tsx'
import type { JsonSchema } from '@/features/block-form/spec.ts'
import { blockValue, type BlockValue } from '@/features/block-form/value.ts'

import { saveSettingsMutation, settingsQuery, slotsQuery } from './queries'
import { SaveFailedAlert } from './save-failed-alert'
import { SlotSection } from './slot-section'
import { StaleAlert } from '../page-editor/stale-alert'
import { useDirtySections, useSectionDirty, type ReportDirty } from './use-dirty-sections'
import { useReloadLatest, useSaveFeedback } from './use-save-feedback'
import { type CopyOf, translateSchema } from './translate-schema'

const SETTINGS_SCHEMA = siteSettingsJsonSchema() as JsonSchema

function useTranslatedSchema() {
  const { t, i18n } = useTranslation('settings')
  return useMemo(() => {
    const copyOf: CopyOf = (path) => ({
      title: t(`fields.${path}.title`),
      description: i18n.exists(`settings:fields.${path}.description`)
        ? t(`fields.${path}.description`)
        : undefined
    })
    return translateSchema(SETTINGS_SCHEMA, copyOf)
  }, [t, i18n])
}

function useSaveSettings(expectedVersion: number) {
  const save = useMutation(saveSettingsMutation(useQueryClient()))
  return useSaveFeedback((value: BlockValue) =>
    save.mutateAsync({ settings: siteSettingsSchema.parse(value), expectedVersion })
  )
}

function GeneralSection({ reportDirty }: { reportDirty: ReportDirty }) {
  const { t } = useTranslation('settings')
  const { data } = useSuspenseQuery(settingsQuery)
  const schema = useTranslatedSchema()
  const { submit, failed, stale, issues, clearStale } = useSaveSettings(data.version)
  const { generation, reload } = useReloadLatest(settingsQuery.queryKey, clearStale)
  const onDirtyChange = useSectionDirty('general', reportDirty)
  return (
    <SectionFrame
      id="general"
      title={t('sections.general.title')}
      description={t('sections.general.description')}
      icon={<GlobeIcon />}
    >
      {failed && <SaveFailedAlert />}
      {stale && <StaleAlert scope="settings" current={stale.current} onReload={reload} />}
      <BlockForm
        key={generation}
        schema={schema}
        locales={LOCALES}
        value={blockValue.parse(data.settings)}
        onSubmit={submit}
        onDirtyChange={onDirtyChange}
        issues={issues}
        className="max-w-none gap-8"
      />
    </SectionFrame>
  )
}

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { data: slots } = useSuspenseQuery(slotsQuery)
  const { dirty, report } = useDirtySections()
  return (
    <>
      <LeaveGuard dirty={dirty} />
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-10">
        <GeneralSection reportDirty={report} />
        {slots.map((slot) => (
          <SlotSection key={slot.name} slot={slot} reportDirty={report} />
        ))}
      </div>
    </>
  )
}
