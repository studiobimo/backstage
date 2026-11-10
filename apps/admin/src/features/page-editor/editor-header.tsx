import { ArrowLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

import { languageName, type LocaleStatus } from '../block-form/locale-status'

interface LocaleTabsProps {
  locales: readonly string[]
  active: string
  gaps: Record<string, LocaleStatus>
  onChange: (locale: string) => void
}

function EditorLocaleTabs({ locales, active, gaps, onChange }: LocaleTabsProps) {
  const { t, i18n } = useTranslation('blockForm')
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

function EditorStatus({ published, dirty }: { published: boolean; dirty: boolean }) {
  const { t } = useTranslation('pageEditor')
  const status = t(published ? 'publish.status.published' : 'publish.status.draft')
  return (
    <>
      <StateDot
        className={dirty ? 'bg-warning' : published ? 'bg-success' : 'bg-muted-foreground/64'}
        label={dirty ? t('unsaved') : status}
      />
      <span className="hidden items-center gap-2 sm:inline-flex">
        <Badge variant={published ? 'success' : 'outline'}>{status}</Badge>
        {dirty && <Badge variant="warning">{t('unsaved')}</Badge>}
      </span>
    </>
  )
}

interface EditorHeaderProps {
  title: string
  published: boolean
  dirty: boolean
  locale: LocaleTabsProps
  actions: ReactNode
}

export function EditorHeader({ title, published, dirty, locale, actions }: EditorHeaderProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <header className="sticky top-0 z-20 -mt-4 border-b bg-background py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="icon" variant="ghost" aria-label={t('back')} render={<Link to="/pages" />}>
          <ArrowLeftIcon aria-hidden />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-xl sm:text-2xl">{title}</h1>
        <EditorStatus published={published} dirty={dirty} />
        <EditorLocaleTabs {...locale} />
        {actions}
      </div>
    </header>
  )
}
