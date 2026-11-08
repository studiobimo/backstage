import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import {
  NumberField as NumberFieldRoot,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/ui/number-field'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import { useFieldContext } from './contexts.ts'
import { useFieldError } from './field-error.ts'

export interface FieldChromeProps {
  label: string
  description?: ReactNode
  optional?: boolean
  badge?: ReactNode
  footer?: ReactNode
}

export function FieldHeading({
  label,
  optional,
  badge,
  legend,
  labelId
}: FieldChromeProps & { legend?: boolean; labelId?: string }) {
  const { t } = useTranslation('form')
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      {legend ? (
        <span className="font-medium text-base/4.5 sm:text-sm/4">{label}</span>
      ) : (
        <FieldLabel id={labelId}>{label}</FieldLabel>
      )}
      {optional && <span className="text-muted-foreground text-xs">{t('optional')}</span>}
      {badge && <span className="ms-auto flex items-center gap-1.5">{badge}</span>}
    </span>
  )
}

interface FieldFrameProps extends FieldChromeProps {
  message?: string
  labelId?: string
  errorId?: string
  children: ReactNode
  className?: string
  inline?: boolean
}

export function FieldFrame({
  children,
  className,
  inline,
  labelId,
  errorId,
  message: shownMessage,
  ...chrome
}: FieldFrameProps) {
  const field = useFieldContext<never>()
  const fieldMessage = useFieldError()
  const message = shownMessage ?? fieldMessage
  const description = chrome.description && (
    <FieldDescription>{chrome.description}</FieldDescription>
  )
  return (
    <Field
      name={field.name}
      invalid={Boolean(message)}
      touched={field.state.meta.isTouched}
      className={cn('w-full', className)}
    >
      {inline ? (
        <span className="flex w-full items-center justify-between gap-4">
          <span className="flex flex-col gap-1">
            <FieldHeading {...chrome} labelId={labelId} />
            {description}
          </span>
          {children}
        </span>
      ) : (
        <>
          <FieldHeading {...chrome} labelId={labelId} />
          {children}
          {description}
        </>
      )}
      <FieldError id={errorId} match={Boolean(message)}>
        {message}
      </FieldError>
      {chrome.footer}
    </Field>
  )
}

export type TextFieldValue = string | undefined
export type NumberFieldValue = number | undefined
export type SwitchFieldValue = boolean | undefined
export type SelectFieldValue = string | number | undefined

interface TextFieldProps extends FieldChromeProps {
  maxLength?: number
  icon?: ReactNode
  emptyValue?: '' | undefined
}

function TextControl({ icon, emptyValue }: TextFieldProps) {
  const field = useFieldContext<TextFieldValue>()
  const props = {
    value: field.state.value ?? '',
    onBlur: field.handleBlur,
    onChange: (event: { target: { value: string } }) =>
      field.handleChange(event.target.value === '' ? emptyValue : event.target.value)
  }
  if (!icon) return <Input {...props} />
  return (
    <InputGroup>
      <InputGroupAddon>{icon}</InputGroupAddon>
      <InputGroupInput {...props} />
    </InputGroup>
  )
}

export function TextField(props: TextFieldProps) {
  const { t } = useTranslation('form')
  const length = useFieldContext<TextFieldValue>().state.value?.length ?? 0
  const counter = props.maxLength !== undefined && (
    <span className="text-muted-foreground text-xs tabular-nums">
      {t('count', { count: length, max: props.maxLength })}
    </span>
  )
  return (
    <FieldFrame {...props} badge={props.badge ?? counter}>
      <TextControl {...props} />
    </FieldFrame>
  )
}

interface NumberFieldProps extends FieldChromeProps {
  min?: number
  max?: number
  integer?: boolean
}

export function NumberField({ min, max, integer, ...chrome }: NumberFieldProps) {
  const field = useFieldContext<NumberFieldValue>()
  return (
    <FieldFrame {...chrome}>
      <NumberFieldRoot
        value={field.state.value ?? null}
        min={min}
        max={max}
        step={integer ? 1 : undefined}
        onValueChange={(value) => field.handleChange(value ?? undefined)}
        className="max-w-48"
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput onBlur={field.handleBlur} />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberFieldRoot>
    </FieldFrame>
  )
}

export function SwitchField(chrome: FieldChromeProps) {
  const field = useFieldContext<SwitchFieldValue>()
  return (
    <FieldFrame {...chrome} inline>
      <Switch
        checked={field.state.value === true}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
      />
    </FieldFrame>
  )
}

interface SelectFieldProps<V extends NonNullable<SelectFieldValue>> extends FieldChromeProps {
  options: readonly { value: V; label: string }[]
}

export function SelectField<V extends NonNullable<SelectFieldValue>>({
  options,
  ...chrome
}: SelectFieldProps<V>) {
  const { t } = useTranslation('form')
  const field = useFieldContext<V | undefined>()
  const items = [...(chrome.optional ? [{ value: null, label: t('none') }] : []), ...options]
  return (
    <FieldFrame {...chrome}>
      <Select
        items={items}
        value={field.state.value ?? null}
        onValueChange={(value: V | null) => field.handleChange(value ?? undefined)}
      >
        <SelectTrigger onBlur={field.handleBlur}>
          <SelectValue placeholder={t('choose')} />
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={String(item.value)} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </FieldFrame>
  )
}
