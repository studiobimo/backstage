import { useStore } from '@tanstack/react-form'
import { ChevronRightIcon, CircleAlertIcon, ListPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFieldContext } from '@/components/form/contexts'
import { FieldHeading } from '@/components/form/fields'
import { useFieldError } from '@/components/form/field-error'
import { IconButton } from '@/components/icon-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import type { SortableSlot } from '@/components/sortable-items'
import { cn } from '@/lib/utils'

import { FieldNode, GroupFields, type NodeProps } from './field-node.tsx'
import { useEditingLocale } from './locale-status.ts'
import type { FieldSpec, ListSpec } from './spec.ts'
import type { BlockFormApi } from './validation.ts'
import {
  type FieldValue,
  fieldName,
  initialValue,
  isRecord,
  isWithinPath,
  type Path,
  readValue,
  summarize
} from './value.ts'

const newKey = () => crypto.randomUUID()

function useItemKeys(length: number) {
  const [keys, setKeys] = useState<string[]>(() => Array.from({ length }, newKey))
  if (keys.length !== length) {
    setKeys((current) =>
      current.length > length
        ? current.slice(0, length)
        : [...current, ...Array.from({ length: length - current.length }, newKey)]
    )
  }
  return { keys, setKeys }
}

function itemTitle(spec: FieldSpec, value: FieldValue | undefined, locales: string[]): string {
  if (spec.kind === 'localized' && isRecord(value)) {
    return (
      locales.map((locale) => itemTitle(spec.inner, value[locale], locales)).find(Boolean) ?? ''
    )
  }
  if (spec.kind !== 'group' || !isRecord(value)) return summarize(value)
  const labelFirst = [...spec.fields].sort(
    (a, b) => Number(b.key === 'label') - Number(a.key === 'label')
  )
  return (
    (spec.variant === 'link' ? labelFirst : spec.fields)
      .map((field) => itemTitle(field, value[field.key], locales))
      .find(Boolean) ?? ''
  )
}

const SortableItems = lazy(() => import('@/components/sortable-items'))

function useItemTitles(form: BlockFormApi, spec: ListSpec, path: Path, count: number) {
  const { t } = useTranslation('blockForm')
  const { active, fallback } = useEditingLocale()
  return useStore(form.store, () =>
    Array.from({ length: count }, (_, index) => {
      const value = readValue(form.getFieldValue(fieldName([...path, index])))
      return (
        itemTitle(spec.item, value, [active, fallback]) || t('list.item', { number: index + 1 })
      )
    })
  )
}

function useItemInvalid(form: BlockFormApi, path: Path) {
  const name = fieldName(path)
  return useStore(
    form.store,
    (state) =>
      state.submissionAttempts > 0 &&
      Object.entries(state.fieldMeta).some(
        ([key, meta]) => isWithinPath(key, name) && (meta?.errors.length ?? 0) > 0
      )
  )
}

const focusFirstControl = (panel: HTMLDivElement | null) =>
  panel?.querySelector<HTMLElement>('input, textarea, button[role=combobox]')?.focus()

interface ListItemProps extends NodeProps<ListSpec> {
  name: string
  initiallyOpen: boolean
  onRemove: () => void
  sortable?: SortableSlot
}

function ItemContent({ form, spec, path, label }: NodeProps<ListSpec>) {
  if (spec.item.kind === 'group')
    return <GroupFields form={form} spec={spec.item} path={path} label={label} />
  return <FieldNode form={form} spec={spec.item} path={path} label={label} />
}

function ListItem({ name, initiallyOpen, onRemove, sortable, ...props }: ListItemProps) {
  const { t } = useTranslation('blockForm')
  const invalid = useItemInvalid(props.form, props.path)
  const [open, setOpen] = useState(initiallyOpen || invalid)
  const [wasInvalid, setWasInvalid] = useState(invalid)
  if (invalid !== wasInvalid) {
    setWasInvalid(invalid)
    if (invalid) setOpen(true)
  }
  return (
    <li
      ref={sortable?.ref}
      className={cn(
        'rounded-lg border bg-card shadow-xs/5 not-dark:bg-clip-padding',
        sortable?.dragging && 'z-10 shadow-lg ring-2 ring-ring/24'
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 p-1">
          {sortable?.handle}
          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-start font-medium text-sm outline-none hover:bg-accent/48 focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90"
              aria-hidden
            />
            <span className="truncate">{name}</span>
            {invalid && (
              <CircleAlertIcon
                className="size-4 shrink-0 text-destructive-foreground"
                aria-label={t('list.hasErrors')}
              />
            )}
          </CollapsibleTrigger>
          <IconButton label={t('list.remove', { item: name })} variant="ghost" onClick={onRemove}>
            <Trash2Icon />
          </IconButton>
        </div>
        <CollapsiblePanel keepMounted>
          <div className="border-t p-4" ref={initiallyOpen ? focusFirstControl : undefined}>
            <ItemContent {...props} label={name} />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </li>
  )
}

function ListEmpty({ label, action }: { label: string; action: ReactNode }) {
  const { t } = useTranslation('blockForm')
  return (
    <Empty className="w-full gap-4 rounded-lg border border-dashed p-5 md:p-5">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListPlusIcon />
        </EmptyMedia>
        <EmptyTitle className="font-sans font-medium text-sm">{t('list.emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('list.emptyDescription', { label })}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  )
}

function useListItems(spec: ListSpec) {
  const field = useFieldContext<(FieldValue | undefined)[] | undefined>()
  const items = field.state.value ?? []
  const { keys, setKeys } = useItemKeys(items.length)
  const [added, setAdded] = useState<string>()

  function add() {
    const key = newKey()
    setKeys((current) => [...current, key])
    setAdded(key)
    field.pushValue(initialValue(spec.item))
  }

  function remove(index: number) {
    setKeys((current) => current.filter((_, position) => position !== index))
    field.removeValue(index)
  }

  function move(from: number, to: number) {
    setKeys((current) => {
      const next = [...current]
      next.splice(to, 0, ...next.splice(from, 1))
      return next
    })
    field.moveValue(from, to)
  }

  return { items, keys, added, add, remove, move }
}

function ListBody(props: NodeProps<ListSpec>) {
  const { t } = useTranslation('blockForm')
  const { spec, path, label, chrome } = props
  const { items, keys, added, add, remove, move } = useListItems(spec)
  const names = useItemTitles(props.form, spec, path, items.length)
  const message = useFieldError()
  const full = spec.maxItems !== undefined && items.length >= spec.maxItems

  const renderItem = (key: string, index: number, sortable?: SortableSlot) => (
    <ListItem
      key={key}
      {...props}
      path={[...path, index]}
      name={names[index]}
      initiallyOpen={key === added}
      onRemove={() => remove(index)}
      sortable={sortable}
    />
  )

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={add} disabled={full}>
      <PlusIcon aria-hidden />
      {t('list.add')}
    </Button>
  )

  return (
    <Fieldset className="flex w-full max-w-none flex-col gap-4">
      <FieldsetLegend className="mb-1 w-full">
        <FieldHeading
          legend
          label={label}
          badge={<Badge variant="secondary">{t('list.count', { count: items.length })}</Badge>}
          {...chrome}
        />
      </FieldsetLegend>
      {spec.description && (
        <p className="-mt-2.5 text-muted-foreground text-xs">{spec.description}</p>
      )}
      {items.length === 0 ? (
        <ListEmpty label={label} action={addButton} />
      ) : (
        <>
          <Suspense
            fallback={
              <ul className="flex flex-col gap-3">
                {keys.map((key, index) => renderItem(key, index))}
              </ul>
            }
          >
            <SortableItems keys={keys} names={names} onMove={move}>
              {renderItem}
            </SortableItems>
          </Suspense>
          <div>{addButton}</div>
        </>
      )}
      {message && (
        <p role="alert" className="text-destructive-foreground text-xs">
          {message}
        </p>
      )}
    </Fieldset>
  )
}

export function ListField(props: NodeProps<ListSpec>) {
  return (
    <props.form.AppField name={fieldName(props.path)} mode="array">
      {() => <ListBody {...props} />}
    </props.form.AppField>
  )
}
