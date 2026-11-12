import type { Locale } from '@studiobimo/backstage'
import { useStore, type AnyFormApi } from '@tanstack/react-form'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useLocaleConfig } from '@/features/config/queries'

import { localesWithErrors } from './locale-errors'

interface LocaleTabsProps {
  form: AnyFormApi
  localeLabel: (locale: Locale) => string
  attentionLabel: string
  renderLocale: (locale: Locale) => ReactNode
}

export function LocaleTabs({ form, localeLabel, attentionLabel, renderLocale }: LocaleTabsProps) {
  const { locales, defaultLocale, hasMultipleLocales } = useLocaleConfig()
  const invalid = useStore(form.store, (state) => localesWithErrors(state.fieldMeta, locales))
  if (!hasMultipleLocales) return renderLocale(defaultLocale)
  return (
    <Tabs defaultValue={defaultLocale}>
      <TabsList className="w-full text-muted-foreground">
        {locales.map((locale) => (
          <TabsTab key={locale} value={locale} className="flex-1 gap-2">
            {localeLabel(locale)}
            {invalid.includes(locale) && (
              <Badge variant="error" size="sm">
                {attentionLabel}
              </Badge>
            )}
          </TabsTab>
        ))}
      </TabsList>
      {locales.map((locale) => (
        <TabsPanel key={locale} value={locale} keepMounted className="pt-4">
          {renderLocale(locale)}
        </TabsPanel>
      ))}
    </Tabs>
  )
}
