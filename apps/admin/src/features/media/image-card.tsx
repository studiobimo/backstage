import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { ALT_STATUS, type AltStatus } from './alt-status'

const STATUS_VARIANT = {
  [ALT_STATUS.described]: 'success',
  [ALT_STATUS.missing]: 'warning',
  [ALT_STATUS.decorative]: 'outline'
} as const

function AltStatusBadge({ status }: { status: AltStatus }) {
  const { t } = useTranslation('media')
  return (
    <Badge variant={STATUS_VARIANT[status]} className="self-start">
      {t(`altStatus.${status}`)}
    </Badge>
  )
}

interface ImageCardProps extends Omit<ComponentProps<'div'>, 'children'> {
  src: string
  name: string
  detail?: string
  altStatus?: AltStatus
  actions?: ReactNode
  footer?: ReactNode
}

export function ImageCard({
  src,
  name,
  detail,
  altStatus,
  actions,
  footer,
  className,
  ...props
}: ImageCardProps) {
  return (
    <div
      className={cn('relative flex min-w-0 flex-col gap-2 rounded-lg p-1', className)}
      {...props}
    >
      <div className="relative">
        <img
          src={src}
          alt=""
          loading="lazy"
          className="aspect-square w-full rounded-md bg-muted object-cover ring-1 ring-border"
        />
        {actions && (
          <div className="absolute end-1.5 top-1.5 rounded-md bg-background/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur-sm">
            {actions}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        <span className="truncate font-medium text-sm">{name}</span>
        {detail && <span className="truncate text-muted-foreground text-xs">{detail}</span>}
        {altStatus && <AltStatusBadge status={altStatus} />}
        {footer}
      </div>
    </div>
  )
}
