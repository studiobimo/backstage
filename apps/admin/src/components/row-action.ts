import type { LucideIcon } from 'lucide-react'

export interface RowAction {
  key: string
  icon: LucideIcon
  label: string
  destructive: boolean
  run: () => void
}

export const actionVariant = (action: RowAction) => (action.destructive ? 'destructive' : 'default')
