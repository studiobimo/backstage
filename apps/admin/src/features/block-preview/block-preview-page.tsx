import { useSuspenseQuery } from '@tanstack/react-query'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@studiobimo/backstage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { previewUrl } from '@/lib/preview-url'
import { blockDescriptionsQuery } from '@/features/page-editor/queries'
import { siteOriginQuery } from './queries'
import { cn } from '@/lib/utils'

const FRAME_WIDTH = { phone: 'max-w-90', tablet: 'max-w-3xl', desktop: 'max-w-none' } as const

type FrameWidth = keyof typeof FRAME_WIDTH

const WIDTHS = Object.keys(FRAME_WIDTH) as FrameWidth[]

function Choice<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={option.value === value ? 'default' : 'outline'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export function BlockPreviewPage() {
  const { t } = useTranslation('blockPreview')
  const { data: blocks } = useSuspenseQuery(blockDescriptionsQuery)
  const { data: siteOrigin } = useSuspenseQuery(siteOriginQuery)
  const [width, setWidth] = useState<FrameWidth>('desktop')
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap gap-3">
            <Choice
              label={t('width.label')}
              value={width}
              options={WIDTHS.map((value) => ({ value, label: t(`width.${value}`) }))}
              onChange={setWidth}
            />
            <Choice
              label={t('language')}
              value={locale}
              options={LOCALES.map((value) => ({ value, label: value.toUpperCase() }))}
              onChange={setLocale}
            />
          </div>
        }
      />
      {blocks.map(({ name, title }) => (
        <section key={name} aria-labelledby={`preview-${name}`} className="flex flex-col gap-2">
          <h2 id={`preview-${name}`} className="font-medium text-sm">
            {title?.[locale] ?? name} <span className="text-muted-foreground">{name}</span>
          </h2>
          <iframe
            title={t('frame', { name: title?.[locale] ?? name })}
            src={previewUrl(siteOrigin, name, locale)}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn('h-136 w-full rounded-lg border bg-background', FRAME_WIDTH[width])}
          />
        </section>
      ))}
    </div>
  )
}
