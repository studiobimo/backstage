import type { FieldIssue } from '@studiobimo/backstage/internal'
import { useStore } from '@tanstack/react-form'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'
import { localeOfIssue } from '@/lib/api-feedback'
import { cn } from '@/lib/utils'

import { GroupFields } from './field-node.tsx'
import {
  EditingLocaleContext,
  hasLocalized,
  localeStatus,
  LockedFieldsContext,
  useEditingLocale
} from './locale-status.ts'
import { LocaleSwitcher } from './locale-switcher.tsx'
import { type GroupSpec, type JsonSchema, parseBlockSchema } from './spec.ts'
import {
  type BlockFormApi,
  type BlockValidator,
  blockValidator,
  setServerError,
  ShownIssuesContext,
  useBlockForm
} from './validation.ts'
import {
  type BlockValue,
  blockValue,
  fieldName,
  initialGroup,
  isRecord,
  readValue,
  withoutUndefined
} from './value.ts'

export interface BlockFormProps {
  schema: JsonSchema
  locales: readonly string[]
  value?: BlockValue
  onSubmit?: (value: BlockValue) => void | Promise<void>
  onChange?: (value: BlockValue) => void
  onDirtyChange?: (dirty: boolean) => void
  issues?: readonly FieldIssue[]
  lockedFields?: readonly string[]
  className?: string
}

const noIssues: readonly never[] = []
const noLocked: readonly string[] = []

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

function useLocaleStatus(
  form: BlockFormApi,
  parsed: ParsedBlock,
  locales: readonly string[],
  refused: readonly FieldIssue[]
) {
  const values = useStore(form.store, (state) => state.values)
  return useMemo(() => {
    const result = parsed.validator.safeParse(values)
    const issuePaths = [
      ...(result.error?.issues.map((issue) => issue.path) ?? []),
      ...refused.map((issue) => issue.path)
    ]
    const current = readValue(values)
    const byLocale = localeStatus(
      parsed.root,
      isRecord(current) ? current : {},
      issuePaths,
      locales
    )
    return { byLocale, issuePaths }
  }, [values, parsed, locales, refused])
}

function useRefusedIssues(
  form: BlockFormApi,
  refused: readonly FieldIssue[],
  locales: readonly string[],
  showLocale: (locale: string) => void
) {
  const placed = useRef<string[]>([])
  useEffect(() => {
    for (const name of placed.current) setServerError(form, name, undefined)
    placed.current = refused.map((issue) => fieldName(issue.path))
    for (const issue of refused) setServerError(form, fieldName(issue.path), issue)
    const locale = refused.map((issue) => localeOfIssue(issue, locales)).find(Boolean)
    if (locale) showLocale(locale)
  }, [form, refused, locales, showLocale])
}

const cleanValue = (values: unknown): BlockValue => blockValue.parse(withoutUndefined(values))

function useEmitChanges(
  form: BlockFormApi,
  initial: BlockValue,
  onChange?: (value: BlockValue) => void
) {
  const values = useStore(form.store, (state) => state.values)
  const lastEmitted = useRef(JSON.stringify(cleanValue(initial)))
  useEffect(() => {
    if (!onChange) return
    const next = cleanValue(values)
    const serialized = JSON.stringify(next)
    if (serialized === lastEmitted.current) return
    lastEmitted.current = serialized
    onChange(next)
  }, [values, onChange])
}

function useReportDirty(
  form: BlockFormApi,
  initial: BlockValue,
  onDirtyChange?: (dirty: boolean) => void
) {
  const values = useStore(form.store, (state) => state.values)
  const dirty = JSON.stringify(cleanValue(values)) !== JSON.stringify(cleanValue(initial))
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])
}

function SupportedBlockForm({
  parsed,
  locales,
  value,
  onSubmit,
  onChange,
  onDirtyChange,
  issues = noIssues,
  lockedFields = noLocked,
  className
}: BlockFormProps & { parsed: ParsedBlock }) {
  const { t } = useTranslation('blockForm')
  const fallback = locales[0] ?? ''
  const [active, setActive] = useState(fallback)
  const embedded = onChange !== undefined
  const initial = useMemo(() => ({ ...initialGroup(parsed.root), ...value }), [parsed, value])
  const form = useBlockForm({
    validator: parsed.validator,
    initial,
    onSubmit: (submitted) => onSubmit?.(submitted)
  })
  useEmitChanges(form, initial, onChange)
  useReportDirty(form, initial, onDirtyChange)
  useRefusedIssues(form, issues, locales, setActive)
  const { byLocale: status, issuePaths } = useLocaleStatus(form, parsed, locales, issues)
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

  const outerEditing = useEditingLocale()

  return (
    <EditingLocaleContext.Provider value={embedded ? outerEditing : editing}>
      <ShownIssuesContext.Provider value={attempted || embedded ? issuePaths : noIssues}>
        <LockedFieldsContext.Provider value={lockedFields}>
          <Form
            noValidate
            className={cn('flex w-full flex-col gap-6', className)}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            {!embedded && locales.length > 1 && hasLocalized(parsed.root) && (
              <LocaleSwitcher
                locales={locales}
                active={active}
                status={status}
                showInvalid={attempted}
                onChange={setActive}
              />
            )}
            <GroupFields form={form} spec={parsed.root} path={[]} label="" />
            {!embedded && (
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
            )}
          </Form>
        </LockedFieldsContext.Provider>
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
