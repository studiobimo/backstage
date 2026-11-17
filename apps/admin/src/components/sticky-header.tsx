import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const STICKY_HEADER_CLASS =
  'sticky top-0 z-20 -mt-4 border-b bg-background py-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-10 after:bg-gradient-to-b after:from-background after:to-transparent'

export function StickyHeader({ className, ...props }: ComponentProps<'header'>) {
  return <header className={cn(STICKY_HEADER_CLASS, className)} {...props} />
}
