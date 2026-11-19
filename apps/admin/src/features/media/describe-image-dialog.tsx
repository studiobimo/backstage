import { MEDIA } from '@studiobimo/backstage'
import { mediaAltSchema, perLocaleKeys, type MediaAlt } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { fieldErrorsOf } from '@/components/form/locale-errors'
import { LocaleTabs } from '@/components/form/locale-tabs'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { useLocaleConfig } from '@/features/config/queries'

import { languageName } from '../block-form/locale-status'
import { ImageCard } from './image-card'
import { imageDetailOf } from './media-details'
import type { AwaitingImage } from './use-media-uploader'

const emptyValuesOf = (locales: readonly string[]) => ({
  decorative: false,
  alt: perLocaleKeys(locales, () => '')
})

function useDescribeForm(onSubmit: (alt: MediaAlt) => void) {
  const { locales } = useLocaleConfig()
  return useAppForm({
    defaultValues: emptyValuesOf(locales),
    validators: {
      onSubmit: ({ value }) => fieldErrorsOf(mediaAltSchema(locales).safeParse(value))
    },
    onSubmit: ({ value }) => onSubmit(mediaAltSchema(locales).parse(value))
  })
}

type DescribeFormApi = ReturnType<typeof useDescribeForm>

function AltTabs({ form }: { form: DescribeFormApi }) {
  const { t, i18n } = useTranslation('media')
  return (
    <LocaleTabs
      form={form}
      localeLabel={(locale) =>
        t(`locales.${locale}`, { defaultValue: languageName(locale, i18n.language) })
      }
      attentionLabel={t('alt.needsAttention')}
      renderLocale={(locale) => (
        <form.AppField name={`alt.${locale}`}>
          {(field) => (
            <field.TextField
              label={t('alt.label')}
              description={t('alt.hint')}
              maxLength={MEDIA.alt.maxLength}
            />
          )}
        </form.AppField>
      )}
    />
  )
}

interface DescribeFormProps {
  item: AwaitingImage
  waiting: number
  onSubmit: (alt: MediaAlt) => void
  onCancel: () => void
}

function DescribeForm({ item, waiting, onSubmit, onCancel }: DescribeFormProps) {
  const { t, i18n } = useTranslation('media')
  const form = useDescribeForm(onSubmit)
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <ImageCard
        className="w-40"
        src={item.previewUrl}
        name={item.image.file.name}
        detail={imageDetailOf({ ...item.image, size: item.image.file.size }, i18n.language, t)}
      />
      <form.AppField name="decorative">
        {(field) => (
          <field.SwitchField
            card
            label={t('decorative.label')}
            description={t('decorative.hint')}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.decorative}>
        {(decorative) => !decorative && <AltTabs form={form} />}
      </form.Subscribe>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">{t('submit')}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('describe.cancel')}
        </Button>
        {waiting > 0 && (
          <span className="text-muted-foreground text-sm">
            {t('describe.waiting', { count: waiting })}
          </span>
        )}
      </div>
    </form>
  )
}

interface DescribeImageDialogProps {
  awaiting: AwaitingImage[]
  onSubmit: (item: AwaitingImage, alt: MediaAlt) => void
  onCancel: (item: AwaitingImage) => void
}

export function DescribeImageDialog({ awaiting, onSubmit, onCancel }: DescribeImageDialogProps) {
  const { t } = useTranslation('media')
  const [item, ...rest] = awaiting
  return (
    <ResponsiveDialog
      open={item !== undefined}
      onOpenChange={(open) => !open && item && onCancel(item)}
      title={t('describe.title')}
      description={t('describe.description')}
    >
      {item && (
        <DescribeForm
          key={item.key}
          item={item}
          waiting={rest.length}
          onSubmit={(alt) => onSubmit(item, alt)}
          onCancel={() => onCancel(item)}
        />
      )}
    </ResponsiveDialog>
  )
}
