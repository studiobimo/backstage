import { LOCALES, siteSettingsJsonSchema, siteSettingsSchema } from '@studiobimo/backstage'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CircleAlertIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BlockForm } from '@/features/block-form/block-form.tsx'
import type { JsonSchema } from '@/features/block-form/spec.ts'
import { blockValue, type BlockValue } from '@/features/block-form/value.ts'
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
  const { submit, failed } = useSaveSettings()
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </header>
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
      />
    </div>
  )
}
