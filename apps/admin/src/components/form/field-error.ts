import { useStore } from '@tanstack/react-form'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useFieldContext } from './contexts.ts'

const issueShape = z.object({
  code: z.string(),
  origin: z.string().optional(),
  expected: z.string().optional(),
  minimum: z.union([z.number(), z.bigint()]).optional(),
  maximum: z.union([z.number(), z.bigint()]).optional()
})

type Issue = z.infer<typeof issueShape>

const boundKey: Record<string, { small: string; big: string }> = {
  string: { small: 'minLength', big: 'maxLength' },
  number: { small: 'minimum', big: 'maximum' },
  array: { small: 'minItems', big: 'maxItems' }
}

function typeIssueKey({ expected }: Issue): string {
  if (expected === 'int') return 'notInteger'
  if (expected === 'number') return 'notNumber'
  return 'format'
}

function sizeIssueKey(issue: Issue): string {
  const keys = boundKey[issue.origin ?? '']
  if (!keys) return 'format'
  if (issue.code === 'too_big') return keys.big
  return issue.origin === 'string' && Number(issue.minimum) === 1 ? 'required' : keys.small
}

function issueKey(issue: Issue): string {
  switch (issue.code) {
    case 'invalid_type':
      return typeIssueKey(issue)
    case 'too_small':
    case 'too_big':
      return sizeIssueKey(issue)
    case 'invalid_value':
      return 'notChoice'
    default:
      return 'format'
  }
}

export function issueMessage(
  t: TFunction<'form'>,
  error: unknown,
  blank: boolean
): string | undefined {
  const issue = issueShape.safeParse(error)
  if (!issue.success) return undefined
  const { minimum, maximum } = issue.data
  const key = blank ? 'required' : issueKey(issue.data)
  return t(`errors.${key}`, { min: Number(minimum), max: Number(maximum) })
}

export function useFieldError(): string | undefined {
  const { t } = useTranslation('form')
  const field = useFieldContext<string | number | boolean | object | undefined>()
  const attempted = useStore(field.form.store, (state) => state.submissionAttempts > 0)
  const { isTouched, errors } = field.state.meta
  if (!attempted && !isTouched) return undefined
  const blank = field.state.value === undefined || field.state.value === ''
  return errors.map((error) => issueMessage(t, error, blank)).find(Boolean)
}
