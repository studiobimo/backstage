import { siteSettingsJsonSchema, siteSettingsSchema } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CircleAlertIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LeaveGuard } from '@/components/leave-guard'
import { PoweredBy } from '@/components/powered-by'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toastManager } from '@/components/ui/toast'
import { EditingLocaleContext } from '@/features/block-form/locale-status'
import type { JsonSchema } from '@/features/block-form/spec.ts'
import { blockValue } from '@/features/block-form/value.ts'
import { useLocaleConfig } from '@/features/config/queries'
import { useShortcut } from '@/lib/shortcuts'

import { PublishSiteSection } from './publish-site-section'
import { registrySettingsQuery, saveSettingsMutation, settingsQuery, slotsQuery } from './queries'
import { RegistrySettingsSection } from './registry-settings-section'
import { SettingsHeader } from './settings-header'
import { SAVE_OUTCOME, SettingsHostContext, useSettingsSections } from './settings-host'
import { SlotSection } from './slot-section'
import { type CopyOf, translateSchema } from './translate-schema'
import { SchemaSection } from './settings-section'
import { useSection } from './use-section'

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

function GeneralSection() {
  const { t } = useTranslation('settings')
  const { data } = useSuspenseQuery(settingsQuery)
  const schema = useTranslatedSchema()
  const save = useMutation(saveSettingsMutation(useQueryClient()))
  const saved = useMemo(() => blockValue.parse(data.settings), [data.settings])
  const section = useSection({
    id: 'general',
    title: t('sections.general.title'),
    schema,
    saved,
    queryKey: settingsQuery.queryKey,
    persist: (value) =>
      save.mutateAsync({ settings: siteSettingsSchema.parse(value), expectedVersion: data.version })
  })
  return (
    <SchemaSection
      {...section}
      title={t('sections.general.title')}
      description={t('sections.general.description')}
      schema={schema}
    />
  )
}

function NotSavedAlert({ sections }: { sections: string[] }) {
  const { t } = useTranslation('settings')
  if (sections.length === 0) return null
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('notSaved.title')}</AlertTitle>
      <AlertDescription>
        {t('notSaved.description', { sections: sections.join(', ') })}
      </AlertDescription>
    </Alert>
  )
}

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { data: slots } = useSuspenseQuery(slotsQuery)
  const { data: registrySettings } = useSuspenseQuery(registrySettingsQuery)
  const { locales, defaultLocale } = useLocaleConfig()
  const [active, setActive] = useState<string>(defaultLocale)
  const sections = useSettingsSections(locales, setActive)
  const editing = useMemo(
    () => ({ locales, active, fallback: defaultLocale }),
    [locales, active, defaultLocale]
  )
  const onSave = async () => {
    const outcomes = await sections.saveAll()
    if (outcomes.length > 0 && outcomes.every((outcome) => outcome === SAVE_OUTCOME.saved)) {
      toastManager.add({
        type: 'success',
        title: t('saved.title'),
        description: t('saved.description')
      })
    }
  }
  useShortcut('save', sections.dirty && !sections.saving, () => void onSave())
  return (
    <SettingsHostContext.Provider value={sections.host}>
      <EditingLocaleContext.Provider value={editing}>
        <LeaveGuard dirty={sections.dirty} />
        <SettingsHeader
          title={t('title')}
          dirty={sections.dirty}
          saving={sections.saving}
          locale={{ locales, active, gaps: sections.gaps, onChange: setActive }}
          onSave={() => void onSave()}
        />
        <p className="text-muted-foreground">{t('description')}</p>
        <NotSavedAlert sections={sections.notSaved} />
        <div className="flex flex-col gap-10">
          <PublishSiteSection />
          <GeneralSection />
          {slots.map((slot) => (
            <SlotSection key={slot.name} slot={slot} />
          ))}
          {registrySettings.schema && <RegistrySettingsSection />}
        </div>
        <PoweredBy className="self-center" />
      </EditingLocaleContext.Provider>
    </SettingsHostContext.Provider>
  )
}
