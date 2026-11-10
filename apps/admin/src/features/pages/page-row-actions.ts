import type { PageSummary } from '@studiobimo/backstage'
import { useNavigate } from '@tanstack/react-router'
import { type LucideIcon, LayoutListIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type PageAction = { kind: 'rename' | 'delete'; page: PageSummary }

export interface RowAction {
  key: string
  icon: LucideIcon
  label: string
  destructive: boolean
  run: () => void
}

export const actionVariant = (action: RowAction) => (action.destructive ? 'destructive' : 'default')

export function useRowActions(
  page: PageSummary,
  onAction: (action: PageAction) => void
): RowAction[] {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  return [
    {
      key: 'edit',
      icon: LayoutListIcon,
      label: t('list.actions.edit'),
      destructive: false,
      run: () => void navigate({ to: '/pages/$pageId', params: { pageId: page.id } })
    },
    {
      key: 'details',
      icon: PencilIcon,
      label: t('list.actions.details'),
      destructive: false,
      run: () => onAction({ kind: 'rename', page })
    },
    {
      key: 'delete',
      icon: Trash2Icon,
      label: t('list.actions.delete'),
      destructive: true,
      run: () => onAction({ kind: 'delete', page })
    }
  ]
}
