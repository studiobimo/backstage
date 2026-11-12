import { MEDIA, mediaAltSchema, mediaTypes, perLocaleKeys } from '@studiobimo/backstage'
import { useMutation } from '@tanstack/react-query'
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { fieldErrorsOf } from '@/components/form/locale-errors'
import { LocaleTabs } from '@/components/form/locale-tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toastManager } from '@/components/ui/toast'
import { useLocaleConfig } from '@/features/config/queries'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { languageName } from '../block-form/locale-status'
import { ImageRejected, processImage, type ProcessedImage } from './process-image'
import { uploadMediaMutation } from './queries'

const emptyValuesOf = (locales: readonly string[]) => ({
  decorative: false,
  alt: perLocaleKeys(locales, () => '')
})

type Selection =
  | { status: 'empty' }
  | { status: 'processing' }
  | { status: 'ready'; image: ProcessedImage; previewUrl: string }
  | { status: 'rejected'; reason: string }

const rejectionReasonOf = (error: unknown) =>
  error instanceof ImageRejected ? error.reason : 'unreadable'

function useSelection() {
  const [selection, setSelection] = useState<Selection>({ status: 'empty' })
  const [pickerKey, setPickerKey] = useState(0)
  const previewUrl = selection.status === 'ready' ? selection.previewUrl : undefined
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl])
  async function select(file: File | undefined) {
    if (!file) return setSelection({ status: 'empty' })
    setSelection({ status: 'processing' })
    try {
      const image = await processImage(file)
      setSelection({ status: 'ready', image, previewUrl: URL.createObjectURL(image.file) })
    } catch (error) {
      setSelection({ status: 'rejected', reason: rejectionReasonOf(error) })
      setPickerKey((key) => key + 1)
    }
  }
  function clear() {
    setSelection({ status: 'empty' })
    setPickerKey((key) => key + 1)
  }
  return { selection, select, clear, pickerKey }
}

function useUploadForm(selection: Selection, onUploaded: () => void) {
  const { t } = useTranslation('media')
  const messageOf = useApiErrorMessage()
  const [failure, setFailure] = useState<string>()
  const upload = useMutation(uploadMediaMutation)
  const { locales } = useLocaleConfig()
  const form = useAppForm({
    defaultValues: emptyValuesOf(locales),
    validators: {
      onSubmit: ({ value }) => fieldErrorsOf(mediaAltSchema(locales).safeParse(value))
    },
    onSubmit: async ({ value }) => {
      if (selection.status !== 'ready') return
      setFailure(undefined)
      try {
        await upload.mutateAsync({
          image: selection.image,
          ...mediaAltSchema(locales).parse(value)
        })
        toastManager.add({ type: 'success', title: t('uploaded.title') })
        form.reset()
        onUploaded()
      } catch (error) {
        setFailure(messageOf(error))
      }
    }
  })
  return { form, failure }
}

type UploadFormApi = ReturnType<typeof useUploadForm>['form']

function Preview({ image, url }: { image: ProcessedImage; url: string }) {
  const { t } = useTranslation('media')
  return (
    <figure className="flex items-center gap-4">
      <img
        src={url}
        alt=""
        width={image.width}
        height={image.height}
        className="size-24 rounded-lg border object-cover"
      />
      <figcaption className="text-muted-foreground text-sm">
        {t('preview.details', {
          name: image.file.name,
          width: image.width,
          height: image.height,
          size: Math.ceil(image.file.size / 1024)
        })}
      </figcaption>
    </figure>
  )
}

function SelectionStatus({ selection }: { selection: Selection }) {
  const { t } = useTranslation('media')
  if (selection.status === 'processing') {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
        <LoaderCircleIcon className="animate-spin" aria-hidden />
        {t('picker.processing')}
      </p>
    )
  }
  if (selection.status === 'rejected') {
    return (
      <Alert variant="error" role="alert">
        <CircleAlertIcon />
        <AlertTitle>{t('picker.rejected')}</AlertTitle>
        <AlertDescription>{t(`rejections.${selection.reason}`)}</AlertDescription>
      </Alert>
    )
  }
  return selection.status === 'ready' ? (
    <Preview image={selection.image} url={selection.previewUrl} />
  ) : null
}

function Picker({ onSelect }: { onSelect: (file: File | undefined) => void }) {
  const { t } = useTranslation('media')
  return (
    <Field>
      <FieldLabel>{t('picker.label')}</FieldLabel>
      <Input
        type="file"
        accept={mediaTypes.join(',')}
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
      <FieldDescription>{t('picker.hint')}</FieldDescription>
    </Field>
  )
}

function AltTabs({ form }: { form: UploadFormApi }) {
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

export function UploadForm() {
  const { t } = useTranslation('media')
  const { selection, select, clear, pickerKey } = useSelection()
  const { form, failure } = useUploadForm(selection, clear)
  return (
    <form
      className="flex max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <Picker key={pickerKey} onSelect={(file) => void select(file)} />
      <SelectionStatus selection={selection} />
      {selection.status === 'ready' && (
        <>
          <form.AppField name="decorative">
            {(field) => (
              <field.SwitchField label={t('decorative.label')} description={t('decorative.hint')} />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.decorative}>
            {(decorative) => !decorative && <AltTabs form={form} />}
          </form.Subscribe>
        </>
      )}
      {failure && (
        <p role="alert" className="text-destructive-foreground text-sm">
          {failure}
        </p>
      )}
      <div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={selection.status !== 'ready' || submitting}>
              {t('submit')}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
