import {
  isSeoMissing,
  PAGE,
  type Locale,
  type LocaleSeo,
  type PageSeo
} from '@studiobimo/backstage'
import { LanguagesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { useEditingLocale } from '../block-form/locale-status'

export interface SeoDefaults {
  titles: Record<string, string>
  siteNames: Partial<Record<string, string>>
  hasSocialImage: boolean
}

interface SeoSectionProps {
  value: PageSeo
  defaults: SeoDefaults
  onChange: (value: PageSeo) => void
}

interface LocaleFieldsProps {
  locale: Locale
  value: LocaleSeo
  fallbackTitle: string
  hasSocialImage: boolean
  onChange: (value: LocaleSeo) => void
}

function LocaleFields({
  locale,
  value,
  fallbackTitle,
  hasSocialImage,
  onChange
}: LocaleFieldsProps) {
  const { t } = useTranslation('pageEditor')
  const { title, description } = PAGE.seo
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Field>
        <FieldLabel>{t('seo.title.label')}</FieldLabel>
        <Input
          lang={locale}
          value={value.title}
          maxLength={title.maxLength}
          placeholder={fallbackTitle}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
        <FieldDescription>
          {t('seo.title.description', { count: value.title.length, max: title.maxLength })}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>{t('seo.description.label')}</FieldLabel>
        <Textarea
          lang={locale}
          value={value.description}
          maxLength={description.maxLength}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
        <FieldDescription>
          {t('seo.description.hint', {
            count: value.description.length,
            max: description.maxLength
          })}
        </FieldDescription>
      </Field>
      <p className="text-muted-foreground text-sm">
        {hasSocialImage ? t('seo.image.default') : t('seo.image.none')}
      </p>
    </div>
  )
}

export function SeoSection({ value, defaults, onChange }: SeoSectionProps) {
  const { t } = useTranslation(['pageEditor', 'blockForm'])
  const { active } = useEditingLocale()
  const locale = active as Locale
  return (
    <section className="flex flex-col gap-3" aria-labelledby="seo-heading">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="seo-heading" className="font-medium text-lg">
            {t('seo.heading')}
          </h2>
          {isSeoMissing(value, locale) && (
            <Badge variant="warning">{t('blockForm:locale.missing')}</Badge>
          )}
          <Badge variant="outline" title={t('blockForm:locale.perLanguage')}>
            <LanguagesIcon aria-hidden />
            {locale.toUpperCase()}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{t('seo.intro')}</p>
      </div>
      <LocaleFields
        key={locale}
        locale={locale}
        value={value[locale]}
        fallbackTitle={defaults.titles[locale] ?? defaults.siteNames[locale] ?? ''}
        hasSocialImage={defaults.hasSocialImage}
        onChange={(next) => onChange({ ...value, [locale]: next })}
      />
    </section>
  )
}
