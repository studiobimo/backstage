import { type ReactNode, useId } from 'react'

import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from '@/components/ui/frame'

interface FrameSectionProps {
  title?: string
  description?: string
  badges?: ReactNode
  actions?: ReactNode
  panel?: boolean
  panelClassName?: string
  children: ReactNode
}

function SectionHeader({
  headingId,
  title,
  description,
  badges,
  actions
}: Pick<FrameSectionProps, 'description' | 'badges' | 'actions'> & {
  headingId: string
  title: string
}) {
  return (
    <FrameHeader>
      <div className="flex flex-wrap items-center gap-2">
        <FrameTitle id={headingId} role="heading" aria-level={2}>
          {title}
        </FrameTitle>
        {badges}
        {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
      </div>
      {description && <FrameDescription>{description}</FrameDescription>}
    </FrameHeader>
  )
}

export function FrameSection({
  title,
  description,
  badges,
  actions,
  panel = true,
  panelClassName,
  children
}: FrameSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={title ? headingId : undefined}>
      <Frame>
        {title && (
          <SectionHeader
            headingId={headingId}
            title={title}
            description={description}
            badges={badges}
            actions={actions}
          />
        )}
        {panel ? <FramePanel className={panelClassName}>{children}</FramePanel> : children}
      </Frame>
    </section>
  )
}
