import { DEFAULT_LOCALE, LOCALES, type Locale, validateBlockContent } from '@studiobimo/backstage'
import { RenderProvider } from '@studiobimo/backstage/render'
import { components } from 'backstage-site/components'
import { type ComponentType, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import './block-preview.css'
import { PREVIEW_MEDIA, PREVIEW_SAMPLES } from './samples'

const FRAME_WIDTH = { phone: 'max-w-90', tablet: 'max-w-3xl', desktop: 'max-w-none' } as const

type FrameWidth = keyof typeof FRAME_WIDTH

const WIDTHS = Object.keys(FRAME_WIDTH) as FrameWidth[]

interface PreviewBlock {
  name: string
  title: Partial<Record<string, string>>
  Component: ComponentType<Record<string, unknown>>
  content: Record<string, unknown>
}

const previewBlocks = [...components.registry.blocks.values()].flatMap((block): PreviewBlock[] => {
  const sample = PREVIEW_SAMPLES[block.name]
  if (sample === undefined) return []
  const result = validateBlockContent(block, block.version, sample)
  const Component = components.blocks[block.name]
  if (!result.ok || !Component) return []
  return [
    {
      name: block.name,
      title: block.title ?? {},
      Component: Component as ComponentType<Record<string, unknown>>,
      content: result.content as Record<string, unknown>
    }
  ]
})

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
      <RenderProvider value={{ locale, defaultLocale: DEFAULT_LOCALE, media: PREVIEW_MEDIA }}>
        {previewBlocks.map(({ name, title, Component, content }) => (
          <section key={name} aria-labelledby={`preview-${name}`} className="flex flex-col gap-2">
            <h2 id={`preview-${name}`} className="font-medium text-sm">
              {title[locale] ?? name} <span className="text-muted-foreground">{name}</span>
            </h2>
            <div className={cn('block-preview', FRAME_WIDTH[width])}>
              <Component {...content} />
            </div>
          </section>
        ))}
      </RenderProvider>
    </div>
  )
}
