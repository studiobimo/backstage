import { isMissingTranslation } from '@studiobimo/backstage'
import { useStore } from '@tanstack/react-form'
import { CopyIcon, LanguagesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { FieldNode, type NodeProps } from './field-node.tsx'
import { languageName, useEditingLocale } from './locale-status.ts'
import type { LocalizedSpec } from './spec.ts'
import type { BlockFormApi } from './validation.ts'
import { fieldName, isRecord, type Path, readValue, summarize } from './value.ts'

function useTranslations(form: BlockFormApi, path: Path) {
  const raw = useStore(form.store, () => form.getFieldValue(fieldName(path)))
  const value = readValue(raw)
  return isRecord(value) ? value : {}
}

function LocaleBadge({ form, path }: { form: BlockFormApi; path: Path }) {
  const { t } = useTranslation('blockForm')
  const { active } = useEditingLocale()
  const missing = isMissingTranslation(useTranslations(form, path), active)
  return (
    <>
      {missing && <Badge variant="warning">{t('locale.missing')}</Badge>}
      <Badge variant="outline" title={t('locale.perLanguage')}>
        <LanguagesIcon aria-hidden />
        {active.toUpperCase()}
      </Badge>
    </>
  )
}

function FallbackReference({ form, path }: { form: BlockFormApi; path: Path }) {
  const { t, i18n } = useTranslation('blockForm')
  const { active, fallback } = useEditingLocale()
  const translations = useTranslations(form, path)
  const reference = summarize(translations[fallback])
  const translated = summarize(translations[active]) === reference
  if (!reference) return null
  const language = languageName(fallback, i18n.language)
  return (
    <div className="flex w-full items-start gap-2 rounded-md bg-muted/64 px-3 py-2 text-xs">
      <p className="min-w-0 flex-1">
        <span className="font-medium text-muted-foreground">{language}</span>
        <span className="mt-0.5 line-clamp-2 block text-foreground/80">{reference}</span>
      </p>
      {!translated && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() =>
            form.setFieldValue(
              fieldName([...path, active]),
              structuredClone(translations[fallback])
            )
          }
        >
          <CopyIcon aria-hidden />
          {t('locale.copyFrom', { language })}
        </Button>
      )}
    </div>
  )
}

export function LocalizedField({ form, spec, path, label }: NodeProps<LocalizedSpec>) {
  const { active, fallback } = useEditingLocale()
  const chrome = {
    badge: <LocaleBadge form={form} path={path} />,
    footer: active === fallback ? undefined : <FallbackReference form={form} path={path} />
  }
  return (
    <FieldNode
      key={active}
      form={form}
      spec={spec.inner}
      path={[...path, active]}
      label={label}
      chrome={chrome}
      translated
    />
  )
}
