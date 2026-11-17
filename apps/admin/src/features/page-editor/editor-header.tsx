import { ArrowLeftIcon } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/page-title'
import { StickyHeader } from '@/components/sticky-header'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { languageName, type LocaleStatus } from '../block-form/locale-status'

export const EDITOR_BODY = 'flex w-full flex-col gap-8'

interface LocaleTabsProps {
  locales: readonly string[]
  active: string
  gaps: Record<string, LocaleStatus>
  onChange: (locale: string) => void
}

function EditorLocaleTabs({ locales, active, gaps, onChange }: LocaleTabsProps) {
  const { t, i18n } = useTranslation('blockForm')
  if (locales.length < 2) return null
  return (
    <Tabs value={active} onValueChange={(value) => onChange(String(value))}>
      <TabsList size="sm" aria-label={t('locale.editing')}>
        {locales.map((locale) => {
          const missing = gaps[locale]?.missing ?? 0
          return (
            <TabsTab
              key={locale}
              value={locale}
              className="text-muted-foreground data-active:text-foreground"
            >
              <span aria-hidden className="uppercase">
                {locale}
              </span>
              <span className="sr-only">{languageName(locale, i18n.language)}</span>
              {missing > 0 && (
                <Badge variant="warning" size="sm">
                  <span aria-hidden>{missing}</span>
                  <span className="sr-only">{t('locale.missingCount', { count: missing })}</span>
                </Badge>
              )}
            </TabsTab>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

function StateDot({ className, label }: { className: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('size-2 shrink-0 rounded-full sm:hidden', className)}
    />
  )
}

interface EditorStatusProps {
  published: boolean
  changed: boolean
  dirty: boolean
}

function EditorStatus({ published, changed, dirty }: EditorStatusProps) {
  const { t } = useTranslation('pageEditor')
  const status = t(
    changed
      ? 'publish.status.changed'
      : published
        ? 'publish.status.published'
        : 'publish.status.draft'
  )
  return (
    <>
      <StateDot
        className={
          dirty || changed ? 'bg-warning' : published ? 'bg-success' : 'bg-muted-foreground/64'
        }
        label={dirty ? t('unsaved') : status}
      />
      <span className="hidden items-center gap-2 sm:inline-flex">
        <Badge variant={changed ? 'warning' : published ? 'success' : 'outline'}>{status}</Badge>
        {dirty && <Badge variant="warning">{t('unsaved')}</Badge>}
      </span>
    </>
  )
}

interface EditorHeaderProps {
  back: { link: ReactElement; label: string }
  title: string
  published: boolean
  changed: boolean
  dirty: boolean
  locale: LocaleTabsProps
  actions: ReactNode
}

export function EditorHeader({
  back,
  title,
  published,
  changed,
  dirty,
  locale,
  actions
}: EditorHeaderProps) {
  return (
    <StickyHeader>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="icon" variant="ghost" aria-label={back.label} render={back.link}>
          <ArrowLeftIcon aria-hidden />
        </Button>
        <PageTitle className="flex-1 truncate">{title}</PageTitle>
        <EditorStatus published={published} changed={changed} dirty={dirty} />
        <EditorLocaleTabs {...locale} />
        {actions}
      </div>
    </StickyHeader>
  )
}
