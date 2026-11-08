import { lazy, Suspense, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts'
import { useFieldError } from '@/components/form/field-error'
import { type FieldChromeProps, FieldFrame } from '@/components/form/fields'
import { Skeleton } from '@/components/ui/skeleton'

import { useHasIssueWithin } from './validation.ts'
import type { BlockValue } from './value.ts'

const RichTextEditor = lazy(() => import('./rich-text-editor.tsx'))

export type RichTextFieldValue = BlockValue | undefined

export function RichTextField(chrome: FieldChromeProps) {
  const field = useFieldContext<RichTextFieldValue>()
  const { t } = useTranslation('blockForm')
  const nested = useHasIssueWithin(field.name)
  const message = useFieldError() ?? (nested ? t('richText.invalid') : undefined)
  const labelId = useId()
  const errorId = useId()
  return (
    <FieldFrame {...chrome} labelId={labelId} errorId={errorId} message={message}>
      <Suspense fallback={<Skeleton className="h-38 w-full rounded-lg" />}>
        <RichTextEditor
          value={field.state.value}
          onChange={(value) => field.handleChange(value)}
          onBlur={field.handleBlur}
          labelId={labelId}
          describedBy={message ? errorId : undefined}
          invalid={Boolean(message)}
        />
      </Suspense>
    </FieldFrame>
  )
}
