import { hasUnpublishedChanges, LOCALES, type PageSummary } from '@studiobimo/backstage'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Frame } from '@/components/ui/frame'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

import { languageName } from '../block-form/locale-status'
import { isPublished } from './page-filters'
import { pageAddresses, pageLabel } from './page-label'
import type { PageAction } from './page-row-actions'
import { PageRowMenu } from './page-row-menu'

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
  const locales = LOCALES.filter((locale) => !onlyMissing || missing[locale] > 0)
  if (locales.length === 0) return null
  return (
    <span className={cn('flex gap-1', className)}>
      {locales.map((locale) => {
        const language = languageName(locale, i18n.language)
        const count = missing[locale]
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
  const published = isPublished(page)
  const changed = hasUnpublishedChanges(page)
  return (
    <Badge variant="outline">
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${changed ? 'bg-warning' : published ? 'bg-success' : 'bg-muted-foreground/64'}`}
      />
      {t(changed ? 'list.changed' : published ? 'list.published' : 'list.draft')}
    </Badge>
  )
}

function TitleCell({ page, name }: { page: PageSummary; name: string }) {
  const { t } = useTranslation('pages')
  return (
    <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-none">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/pages/$pageId"
            params={{ pageId: page.id }}
            className="truncate rounded-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {name}
          </Link>
          {page.isHome && <Badge variant="secondary">{t('list.home')}</Badge>}
        </div>
        <LanguageBadges missing={page.missing} onlyMissing className="sm:hidden" />
        <p className="flex gap-x-3 truncate font-mono text-muted-foreground text-xs">
          {pageAddresses(page).map((address) => (
            <span key={address}>{address}</span>
          ))}
        </p>
      </div>
    </TableCell>
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
  const name = pageLabel(page, i18n.language)
  return (
    <TableRow>
      <TitleCell page={page} name={name} />
      <TableCell className={COLUMN.languages}>
        <LanguageBadges missing={page.missing} />
      </TableCell>
      <TableCell>
        <StatusBadge page={page} />
      </TableCell>
      <TableCell className={`${COLUMN.updated} text-muted-foreground`}>
        {formatDateTime(i18n.language, page.updatedAt)}
      </TableCell>
      <TableCell className="w-px">
        <PageRowMenu page={page} onAction={onAction} />
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
  return (
    <Frame>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>{t('list.columns.title')}</TableHead>
            <TableHead className={COLUMN.languages}>{t('list.columns.languages')}</TableHead>
            <TableHead>{t('list.columns.status')}</TableHead>
            <TableHead className={COLUMN.updated}>{t('list.columns.updated')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('list.columns.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <PageRow key={page.id} page={page} onAction={onAction} />
          ))}
        </TableBody>
      </Table>
    </Frame>
  )
}
