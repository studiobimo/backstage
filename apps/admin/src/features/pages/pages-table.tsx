import { hasUnpublishedChanges, type PageSummary } from '@studiobimo/backstage/internal'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CardTable } from '@/components/card-table'
import { PublishStateBadge } from '@/components/publish-state-badge'
import { RowMenu } from '@/components/row-menu'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { UserAvatar } from '@/components/user-avatar'
import { useLocaleConfig } from '@/features/config/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

import { languageName } from '../block-form/locale-status'
import { isPublished } from './page-filters'
import { pageAddresses, pageLabel } from './page-label'
import { type PageAction, useRowActions } from './page-row-actions'

const COLUMN = {
  languages: 'hidden sm:table-cell',
  updated: 'hidden md:table-cell'
} as const

function LanguageBadges({
  missing,
  onlyMissing = false,
  className
}: {
  missing: PageSummary['missing']
  onlyMissing?: boolean
  className?: string
}) {
  const { t, i18n } = useTranslation('pages')
  const config = useLocaleConfig()
  const locales = config.locales.filter((locale) => !onlyMissing || (missing[locale] ?? 0) > 0)
  if (!config.hasMultipleLocales || locales.length === 0) return null
  return (
    <span className={cn('flex gap-1', className)}>
      {locales.map((locale) => {
        const language = languageName(locale, i18n.language)
        const count = missing[locale] ?? 0
        return (
          <Badge key={locale} variant={count > 0 ? 'warning' : 'outline'}>
            <span aria-hidden className="uppercase">
              {locale}
              {count > 0 && ` · ${count}`}
            </span>
            <span className="sr-only">
              {count > 0 ? t('list.missing', { count, language }) : language}
            </span>
          </Badge>
        )
      })}
    </span>
  )
}

function StatusBadge({ page }: { page: PageSummary }) {
  const { t } = useTranslation('pages')
  return (
    <PublishStateBadge
      published={isPublished(page)}
      changed={hasUnpublishedChanges(page)}
      labels={{
        published: t('list.published'),
        changed: t('list.changed'),
        draft: t('list.draft')
      }}
    />
  )
}

function TitleCell({ page, name }: { page: PageSummary; name: string }) {
  const { t } = useTranslation('pages')
  const config = useLocaleConfig()
  return (
    <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-none">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/pages/$pageId"
            params={{ pageId: page.id }}
            className="truncate rounded-sm py-0.5 font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {name}
          </Link>
          {page.isHome && <Badge variant="secondary">{t('list.home')}</Badge>}
        </div>
        <LanguageBadges missing={page.missing} onlyMissing className="sm:hidden" />
        <p className="flex flex-wrap gap-1.5">
          {pageAddresses(page, config).map((address) => (
            <Badge key={address} variant="outline" size="sm" className="font-mono font-normal">
              {address}
            </Badge>
          ))}
        </p>
      </div>
    </TableCell>
  )
}

function PageActionsMenu({
  page,
  onAction
}: {
  page: PageSummary
  onAction: (action: PageAction) => void
}) {
  const { t, i18n } = useTranslation('pages')
  const actions = useRowActions(page, onAction)
  return (
    <RowMenu
      triggerLabel={t('list.actions.open', { name: pageLabel(page, i18n.language) })}
      actions={actions}
    />
  )
}

function PageRow({
  page,
  onAction
}: {
  page: PageSummary
  onAction: (action: PageAction) => void
}) {
  const { i18n } = useTranslation('pages')
  const { hasMultipleLocales } = useLocaleConfig()
  const name = pageLabel(page, i18n.language)
  return (
    <TableRow>
      <TitleCell page={page} name={name} />
      {hasMultipleLocales && (
        <TableCell className={COLUMN.languages}>
          <LanguageBadges missing={page.missing} />
        </TableCell>
      )}
      <TableCell>
        <StatusBadge page={page} />
      </TableCell>
      <TableCell className={`${COLUMN.updated} text-muted-foreground`}>
        <span className="flex items-center gap-2">
          {page.updatedBy && <UserAvatar name={page.updatedBy} className="size-5 text-[10px]" />}
          {formatDateTime(i18n.language, page.updatedAt)}
        </span>
      </TableCell>
      <TableCell className="w-px">
        <PageActionsMenu page={page} onAction={onAction} />
      </TableCell>
    </TableRow>
  )
}

interface PagesTableProps {
  pages: PageSummary[]
  onAction: (action: PageAction) => void
}

export function PagesTable({ pages, onAction }: PagesTableProps) {
  const { t } = useTranslation('pages')
  const { hasMultipleLocales } = useLocaleConfig()
  return (
    <CardTable
      head={
        <>
          <TableHead>{t('list.columns.title')}</TableHead>
          {hasMultipleLocales && (
            <TableHead className={COLUMN.languages}>{t('list.columns.languages')}</TableHead>
          )}
          <TableHead>{t('list.columns.status')}</TableHead>
          <TableHead className={COLUMN.updated}>{t('list.columns.updated')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('list.columns.actions')}</span>
          </TableHead>
        </>
      }
    >
      {pages.map((page) => (
        <PageRow key={page.id} page={page} onAction={onAction} />
      ))}
    </CardTable>
  )
}
