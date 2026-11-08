import { useStore } from '@tanstack/react-form'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'

import { GroupFields } from './field-node.tsx'
import { type GroupSpec, type JsonSchema, parseBlockSchema } from './spec.ts'
import {
  type BlockFormApi,
  type BlockValidator,
  blockValidator,
  useBlockForm
} from './validation.ts'
import { type BlockValue, initialGroup } from './value.ts'

export interface BlockFormProps {
  schema: JsonSchema
  value?: BlockValue
  onSubmit: (value: BlockValue) => void | Promise<void>
}

interface ParsedBlock {
  root: GroupSpec
  validator: BlockValidator
}

function parseOrNull(schema: JsonSchema): ParsedBlock | null {
  try {
    return { root: parseBlockSchema(schema), validator: blockValidator(schema) }
  } catch {
    return null
  }
}

function useIssueCount(form: BlockFormApi, parsed: ParsedBlock) {
  const values = useStore(form.store, (state) => state.values)
  return useMemo(
    () => parsed.validator.safeParse(values).error?.issues.length ?? 0,
    [values, parsed]
  )
}

function SupportedBlockForm({ parsed, value, onSubmit }: BlockFormProps & { parsed: ParsedBlock }) {
  const { t } = useTranslation('blockForm')
  const form = useBlockForm({
    validator: parsed.validator,
    initial: { ...initialGroup(parsed.root), ...value },
    onSubmit
  })
  const issues = useIssueCount(form, parsed)
  const attempted = useStore(form.store, (state) => state.submissionAttempts > 0)
  const submitting = useStore(form.store, (state) => state.isSubmitting)

  return (
    <Form
      noValidate
      className="flex w-full max-w-2xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <GroupFields form={form} spec={parsed.root} path={[]} label="" />
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {attempted && issues > 0 && (
          <p role="alert" className="text-destructive-foreground text-sm">
            {t('invalidSummary', { count: issues })}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner />}
          {t('save')}
        </Button>
      </div>
    </Form>
  )
}

export function BlockForm({ schema, ...props }: BlockFormProps) {
  const { t } = useTranslation('blockForm')
  const parsed = useMemo(() => parseOrNull(schema), [schema])
  if (!parsed) return <p role="alert">{t('unsupported')}</p>
  return <SupportedBlockForm parsed={parsed} schema={schema} {...props} />
}
