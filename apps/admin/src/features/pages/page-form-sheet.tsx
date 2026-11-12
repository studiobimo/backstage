import { LOCALES, pageInputSchema, slugify, type Locale, type Page } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { fieldErrorsOf } from '@/components/form/locale-errors'
import { LocaleTabs } from '@/components/form/locale-tabs'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle
} from '@/components/ui/sheet'
import { ApiError } from '@/lib/api'

import { createPageMutation, renamePageMutation } from './queries'

interface PageFormSheetProps {
  page?: Page
  open: boolean
  onOpenChange: (open: boolean) => void
}

const valuesOf = (page?: Page) => {
  const byLocale = (field: 'slug' | 'title') =>
    Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        page?.locales.find((row) => row.locale === locale)?.[field] ?? ''
      ])
    ) as Record<Locale, string>
  return { isHome: page?.isHome ?? false, slugs: byLocale('slug'), titles: byLocale('title') }
}

function usePageForm(page: Page | undefined, onSaved: () => void) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<string>()
  const create = useMutation(createPageMutation(queryClient))
  const rename = useMutation(renamePageMutation(queryClient))
  const form = useAppForm({
    defaultValues: valuesOf(page),
    validators: { onSubmit: ({ value }) => fieldErrorsOf(pageInputSchema.safeParse(value)) },
    onSubmit: async ({ value }) => {
      setFailure(undefined)
      const input = pageInputSchema.parse(value)
      try {
        if (page) await rename.mutateAsync({ id: page.id, input, expectedVersion: page.version })
        else await create.mutateAsync(input)
        onSaved()
      } catch (error) {
        setFailure(error instanceof ApiError ? t(`errors.${error.code}`) : t('errors.internal'))
      }
    }
  })
  return { form, failure }
}

type PageForm = ReturnType<typeof usePageForm>['form']

function LocaleFields({ form, locale, page }: { form: PageForm; locale: Locale; page?: Page }) {
  const { t } = useTranslation('pages')
  const slugName = `slugs.${locale}` as const
  return (
    <div className="flex flex-col gap-4">
      <form.AppField
        name={`titles.${locale}`}
        listeners={{
          onChange: ({ value }) => {
            if (!page && !form.getFieldMeta(slugName)?.isDirty) {
              form.setFieldValue(slugName, slugify(value), { dontUpdateMeta: true })
            }
          }
        }}
      >
        {(field) => <field.TextField label={t('form.title')} />}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.isHome}>
        {(isHome) =>
          !isHome && (
            <form.AppField name={slugName}>
              {(field) => (
                <field.TextField
                  label={t('form.slug')}
                  description={t('form.slugHint')}
                  icon={<span className="font-mono">/{locale}/</span>}
                />
              )}
            </form.AppField>
          )
        }
      </form.Subscribe>
    </div>
  )
}

function PageLocaleTabs({ form, page }: { form: PageForm; page?: Page }) {
  const { t } = useTranslation('pages')
  return (
    <LocaleTabs
      form={form}
      localeLabel={(locale) => t(`locales.${locale}`)}
      attentionLabel={t('form.needsAttention')}
      renderLocale={(locale) => <LocaleFields form={form} locale={locale} page={page} />}
    />
  )
}

export function PageFormSheet({ page, open, onOpenChange }: PageFormSheetProps) {
  const { t } = useTranslation('pages')
  const { form, failure } = usePageForm(page, () => onOpenChange(false))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <SheetHeader>
            <SheetTitle>{page ? t('form.renameTitle') : t('form.createTitle')}</SheetTitle>
            <SheetDescription>{t('form.description')}</SheetDescription>
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-6">
            {!page && (
              <form.AppField name="isHome">
                {(field) => (
                  <field.SwitchField label={t('form.isHome')} description={t('form.isHomeHint')} />
                )}
              </form.AppField>
            )}
            <PageLocaleTabs form={form} page={page} />
            {failure && (
              <p role="alert" className="text-destructive-foreground text-sm">
                {failure}
              </p>
            )}
          </SheetPanel>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit">{page ? t('form.save') : t('form.create')}</Button>
          </SheetFooter>
        </form>
      </SheetPopup>
    </Sheet>
  )
}
