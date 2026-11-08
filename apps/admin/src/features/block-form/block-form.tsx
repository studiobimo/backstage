import { useStore } from '@tanstack/react-form'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { GroupFields } from './field-node.tsx'
import { EditingLocaleContext, hasLocalized, localeStatus } from './locale-status.ts'
import { LocaleSwitcher } from './locale-switcher.tsx'
import { type GroupSpec, type JsonSchema, parseBlockSchema } from './spec.ts'
import {
  type BlockFormApi,
  type BlockValidator,
  blockValidator,
  ShownIssuesContext,
  useBlockForm
} from './validation.ts'
import { type BlockValue, initialGroup, readValue, isRecord } from './value.ts'

export interface BlockFormProps {
  schema: JsonSchema
  locales: readonly string[]
  value?: BlockValue
  onSubmit: (value: BlockValue) => void | Promise<void>
  className?: string
}

const noIssues: readonly never[] = []

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

function useLocaleStatus(form: BlockFormApi, parsed: ParsedBlock, locales: readonly string[]) {
  const values = useStore(form.store, (state) => state.values)
  return useMemo(() => {
    const result = parsed.validator.safeParse(values)
    const issuePaths = result.error?.issues.map((issue) => issue.path) ?? []
    const current = readValue(values)
    const byLocale = localeStatus(
      parsed.root,
      isRecord(current) ? current : {},
      issuePaths,
      locales
    )
    return { byLocale, issuePaths }
  }, [values, parsed, locales])
}

function SupportedBlockForm({
  parsed,
  locales,
  value,
  onSubmit,
  className
}: BlockFormProps & { parsed: ParsedBlock }) {
  const { t } = useTranslation('blockForm')
  const fallback = locales[0] ?? ''
  const [active, setActive] = useState(fallback)
  const form = useBlockForm({
    validator: parsed.validator,
    initial: { ...initialGroup(parsed.root), ...value },
    onSubmit
  })
  const { byLocale: status, issuePaths } = useLocaleStatus(form, parsed, locales)
  const attempted = useStore(form.store, (state) => state.submissionAttempts > 0)
  const submitting = useStore(form.store, (state) => state.isSubmitting)
  const editing = useMemo(() => ({ locales, active, fallback }), [locales, active, fallback])

  function submit() {
    void form.handleSubmit().then(() => {
      const invalidHere = status[active]?.invalid
      const firstInvalid = locales.find((locale) => status[locale]?.invalid)
      if (!invalidHere && firstInvalid) setActive(firstInvalid)
    })
  }

  return (
    <EditingLocaleContext.Provider value={editing}>
      <ShownIssuesContext.Provider value={attempted ? issuePaths : noIssues}>
        <Form
          noValidate
          className={cn('flex w-full max-w-2xl flex-col gap-6', className)}
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {locales.length > 1 && hasLocalized(parsed.root) && (
            <LocaleSwitcher
              locales={locales}
              active={active}
              status={status}
              showInvalid={attempted}
              onChange={setActive}
            />
          )}
          <GroupFields form={form} spec={parsed.root} path={[]} label="" />
          <div className="sticky bottom-10 z-10 flex items-center justify-end gap-3">
            {attempted && issuePaths.length > 0 && (
              <p role="alert" className="text-destructive-foreground text-sm">
                {t('invalidSummary', { count: issuePaths.length })}
              </p>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner />}
              {t('save')}
            </Button>
          </div>
        </Form>
      </ShownIssuesContext.Provider>
    </EditingLocaleContext.Provider>
  )
}

export function BlockForm({ schema, ...props }: BlockFormProps) {
  const { t } = useTranslation('blockForm')
  const parsed = useMemo(() => parseOrNull(schema), [schema])
  if (!parsed) return <p role="alert">{t('unsupported')}</p>
  return <SupportedBlockForm parsed={parsed} schema={schema} {...props} />
}
