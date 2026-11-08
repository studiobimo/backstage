import { LOCALES, siteSettingsJsonSchema, siteSettingsSchema } from '@studiobimo/backstage'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CircleAlertIcon, GlobeIcon, MailIcon, PanelBottomIcon, PanelTopIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BlockForm } from '@/features/block-form/block-form.tsx'
import type { FormSection } from '@/features/block-form/form-sections.tsx'
import type { JsonSchema } from '@/features/block-form/spec.ts'
import { blockValue, type BlockValue } from '@/features/block-form/value.ts'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toastManager } from '@/components/ui/toast'

import { saveSettingsMutation, settingsQuery } from './queries'
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

const SECTIONS = [
  { id: 'general', icon: <GlobeIcon />, fields: ['siteName', 'defaultSocialImage'] },
  { id: 'header', icon: <PanelTopIcon />, fields: ['navigation'] },
  { id: 'footer', icon: <PanelBottomIcon />, group: 'footer' },
  { id: 'contact', icon: <MailIcon />, group: 'contact' }
] as const

function useSections(): FormSection[] {
  const { t } = useTranslation('settings')
  return useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        title: t(`sections.${section.id}.title`),
        description: t(`sections.${section.id}.description`)
      })),
    [t]
  )
}

function useSaveSettings() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const save = useMutation(saveSettingsMutation(queryClient))
  const [failed, setFailed] = useState(false)
  async function submit(value: BlockValue) {
    setFailed(false)
    try {
      await save.mutateAsync(siteSettingsSchema.parse(value))
      toastManager.add({
        type: 'success',
        title: t('saved.title'),
        description: t('saved.description')
      })
    } catch {
      setFailed(true)
    }
  }
  return { submit, failed }
}

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { data: settings } = useSuspenseQuery(settingsQuery)
  const schema = useTranslatedSchema()
  const sections = useSections()
  const { submit, failed } = useSaveSettings()
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      {failed && (
        <Alert variant="error" role="alert">
          <CircleAlertIcon />
          <AlertTitle>{t('failed.title')}</AlertTitle>
          <AlertDescription>{t('failed.description')}</AlertDescription>
        </Alert>
      )}
      <BlockForm
        schema={schema}
        locales={LOCALES}
        value={blockValue.parse(settings)}
        onSubmit={submit}
        sections={sections}
        className="max-w-none gap-10"
      />
    </>
  )
}
