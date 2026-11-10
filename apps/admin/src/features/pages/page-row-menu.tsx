import type { PageSummary } from '@studiobimo/backstage'
import { EllipsisIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import { useMediaQuery } from '@/hooks/use-media-query'

import { pageLabel } from './page-label'
import { actionVariant, type PageAction, useRowActions } from './page-row-actions'

const PageRowDrawer = lazy(async () => ({
  default: (await import('./page-row-drawer')).PageRowDrawer
}))

interface PageRowMenuProps {
  page: PageSummary
  onAction: (action: PageAction) => void
}

export function PageRowMenu({ page, onAction }: PageRowMenuProps) {
  const { t, i18n } = useTranslation('pages')
  const isMobile = useMediaQuery('max-md')
  const actions = useRowActions(page, onAction)
  const triggerLabel = t('list.actions.open', { name: pageLabel(page, i18n.language) })

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <PageRowDrawer triggerLabel={triggerLabel} actions={actions} />
      </Suspense>
    )
  }

  return (
    <Menu>
      <MenuTrigger render={<Button size="icon" variant="ghost" aria-label={triggerLabel} />}>
        <EllipsisIcon aria-hidden />
      </MenuTrigger>
      <MenuPopup align="end">
        {actions.map((action) => (
          <MenuItem key={action.key} variant={actionVariant(action)} onClick={action.run}>
            <action.icon aria-hidden />
            {action.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  )
}
