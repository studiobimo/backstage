import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function PageTitle({ className, children, ...props }: ComponentProps<'h1'>) {
  return (
    <h1 className={cn('min-w-0 text-2xl', className)} {...props}>
      {children}
    </h1>
  )
}
