import { MEDIA } from '@studiobimo/backstage'
import { mediaAltSchema, mediaTypes, perLocaleKeys } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressIndicator,
  ProgressValue
} from '@/components/ui/progress'
import { toastManager } from '@/components/ui/toast'
import { useLocaleConfig } from '@/features/config/queries'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { languageName } from '../block-form/locale-status'
import { ImageCard } from './image-card'
import { imageDetailOf } from './media-details'
import { ImageRejected, processImage, type ProcessedImage } from './process-image'
import { uploadMediaMutation } from './queries'

const PERCENT = 100

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
  const upload = useMutation(uploadMediaMutation(useQueryClient()))
  const [progress, setProgress] = useState(0)
  const { locales } = useLocaleConfig()
  const form = useAppForm({
    defaultValues: emptyValuesOf(locales),
    validators: {
      onSubmit: ({ value }) => fieldErrorsOf(mediaAltSchema(locales).safeParse(value))
    },
    onSubmit: async ({ value }) => {
      if (selection.status !== 'ready') return
      setFailure(undefined)
      setProgress(0)
      try {
        await upload.mutateAsync({
          image: selection.image,
          onProgress: setProgress,
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
  return { form, failure, progress }
}

type UploadFormApi = ReturnType<typeof useUploadForm>['form']

function Preview({ image, url }: { image: ProcessedImage; url: string }) {
  const { t, i18n } = useTranslation('media')
  return (
    <ImageCard
      className="w-40"
      src={url}
      name={image.file.name}
      detail={imageDetailOf({ ...image, size: image.file.size }, i18n.language, t)}
    />
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

function UploadProgress({ fraction }: { fraction: number }) {
  const { t } = useTranslation('media')
  return (
    <Progress value={Math.round(fraction * PERCENT)}>
      <div className="flex items-center justify-between gap-2">
        <ProgressLabel>{t('upload.progress')}</ProgressLabel>
        <ProgressValue />
      </div>
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  )
}

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useTranslation('media')
  const { selection, select, clear, pickerKey } = useSelection()
  const { form, failure, progress } = useUploadForm(selection, () => {
    clear()
    onUploaded()
  })
  return (
    <form
      className="flex flex-col gap-6"
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
        </>
      )}
      {failure && (
        <p role="alert" className="text-destructive-foreground text-sm">
          {failure}
        </p>
      )}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <>
            {submitting && <UploadProgress fraction={progress} />}
            <div>
              <Button type="submit" disabled={selection.status !== 'ready' || submitting}>
                {t('submit')}
              </Button>
            </div>
          </>
        )}
      </form.Subscribe>
    </form>
  )
}
