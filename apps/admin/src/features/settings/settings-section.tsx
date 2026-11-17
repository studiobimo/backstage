import type { ReactNode } from 'react'

import { FrameSection } from '@/components/frame-section'

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
