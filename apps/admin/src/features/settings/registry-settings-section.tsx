import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { JsonSchema } from '@/features/block-form/spec.ts'
import { blockValue } from '@/features/block-form/value.ts'

import { registrySettingsQuery, saveRegistrySettingsMutation } from './queries'
import { SchemaSection } from './settings-section'
import { useSection } from './use-section'

export function RegistrySettingsSection() {
  const { t } = useTranslation('settings')
  const { data } = useSuspenseQuery(registrySettingsQuery)
  const save = useMutation(saveRegistrySettingsMutation(useQueryClient()))
  const schema = data.schema as JsonSchema
  const saved = useMemo(() => blockValue.parse(data.settings), [data.settings])
  const section = useSection({
    id: 'registry',
    title: t('sections.registry.title'),
    schema,
    saved,
    queryKey: registrySettingsQuery.queryKey,
    persist: (value) => save.mutateAsync({ settings: value, expectedVersion: data.version })
  })
  return (
    <SchemaSection
      {...section}
      title={t('sections.registry.title')}
      description={t('sections.registry.description')}
      schema={schema}
    />
  )
}
