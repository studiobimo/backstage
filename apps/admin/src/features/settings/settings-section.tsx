import type { ComponentProps, ReactNode } from 'react'

import { FrameSection } from '@/components/frame-section'
import { BlockForm } from '@/features/block-form/block-form.tsx'

import { StaleAlert } from '../page-editor/stale-alert'
import { SaveFailedAlert } from './save-failed-alert'
import type { useSection } from './use-section'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <FrameSection
      title={title}
      description={description}
      panelClassName="flex min-w-0 flex-col gap-6"
    >
      {children}
    </FrameSection>
  )
}

type SectionState = ReturnType<typeof useSection>

interface SchemaSectionProps extends SectionState {
  title: string
  description: string
  schema: ComponentProps<typeof BlockForm>['schema']
}

export function SchemaSection({
  title,
  description,
  schema,
  form,
  failed,
  stale,
  reload,
  generation
}: SchemaSectionProps) {
  return (
    <SettingsSection title={title} description={description}>
      {failed && <SaveFailedAlert />}
      {stale && <StaleAlert scope="settings" current={stale.current} onReload={reload} />}
      <BlockForm key={generation} schema={schema} className="max-w-none gap-8" {...form} />
    </SettingsSection>
  )
}
