import { LOCALES, pageInputSchema, slugify, type Locale, type Page } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

import { createPageMutation, PagesApiError, renamePageMutation } from './queries'

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

const fieldErrorsOf = (result: ReturnType<typeof pageInputSchema.safeParse>) =>
  result.success
    ? undefined
    : {
        fields: Object.fromEntries(
          result.error.issues.map((issue) => [issue.path.join('.'), [issue]])
        )
      }

const localesWithErrors = (fieldMeta: Record<string, { errors: unknown[] }>) =>
  LOCALES.filter((locale) =>
    Object.entries(fieldMeta).some(
      ([name, meta]) => name.endsWith(`.${locale}`) && meta.errors.length > 0
    )
  )

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
        if (page) await rename.mutateAsync({ id: page.id, input })
        else await create.mutateAsync(input)
        onSaved()
      } catch (error) {
        setFailure(
          error instanceof PagesApiError ? t(`errors.${error.code}`) : t('errors.internal')
        )
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

function LocaleTabs({ form, page }: { form: PageForm; page?: Page }) {
  const { t } = useTranslation('pages')
  return (
    <Tabs defaultValue={LOCALES[0]}>
      <form.Subscribe selector={(state) => localesWithErrors(state.fieldMeta)}>
        {(invalid) => (
          <TabsList className="w-full">
            {LOCALES.map((locale) => (
              <TabsTab key={locale} value={locale} className="flex-1 gap-2">
                {t(`locales.${locale}`)}
                {invalid.includes(locale) && (
                  <Badge variant="error" size="sm">
                    {t('form.needsAttention')}
                  </Badge>
                )}
              </TabsTab>
            ))}
          </TabsList>
        )}
      </form.Subscribe>
      {LOCALES.map((locale) => (
        <TabsPanel key={locale} value={locale} keepMounted className="pt-4">
          <LocaleFields form={form} locale={locale} page={page} />
        </TabsPanel>
      ))}
    </Tabs>
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
            <LocaleTabs form={form} page={page} />
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
