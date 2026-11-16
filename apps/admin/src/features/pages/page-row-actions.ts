import type { PageSummary } from '@studiobimo/backstage/internal'
import { useNavigate } from '@tanstack/react-router'
import { LayoutListIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { RowAction } from '@/components/row-action'

export type PageAction = { kind: 'rename' | 'delete'; page: PageSummary }

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
