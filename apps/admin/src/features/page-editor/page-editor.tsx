import {
  API_ERROR,
  LOCALES,
  type Locale,
  type PageBlock,
  type PageSeo,
  type PageStamp
} from '@studiobimo/backstage'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChoiceSelect } from '@/components/choice-select'
import { IconButton } from '@/components/icon-button'
import type { SortableSlot } from '@/components/sortable-items'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import { BlockForm } from '../block-form/block-form'
import { EditingLocaleContext, useEditingLocale } from '../block-form/locale-status'
import type { BlockValue } from '../block-form/value'
import { LocaleSwitcher } from '../block-form/locale-switcher'
import { LeaveGuard } from './leave-guard'
import { PublishPanel } from './publish-panel'
import { StaleAlert } from './stale-alert'
import { pageLabel } from '../pages/page-label'
import { pagesQuery } from '../pages/queries'
import { settingsQuery } from '../settings/queries'
import {
  type BlockOption,
  duplicateAt,
  localeGaps,
  moveBlock,
  newBlock,
  removeAt,
  sameBlocks,
  sameJson
} from './draft'
import {
  blockDescriptionsQuery,
  layoutsQuery,
  pageBlocksKey,
  pageBlocksQuery,
  pageSeoKey,
  pageSeoQuery,
  savePageBlocksMutation,
  savePageLayoutMutation,
  savePageSeoMutation
} from './queries'
import { type SeoDefaults, SeoSection } from './seo-section'

const SortableItems = lazy(() => import('@/components/sortable-items'))

interface PageDraft {
  blocks: PageBlock[]
  layout: string
  seo: PageSeo
}

interface SavedPage extends PageDraft {
  version: number
}

interface BlockRowProps {
  block: PageBlock
  name: string
  option?: BlockOption
  position: number
  slot?: SortableSlot
  onChange: (content: BlockValue) => void
  onDuplicate: () => void
  onRemove: () => void
}

function BlockRow({
  block,
  name,
  option,
  position,
  slot,
  onChange,
  onDuplicate,
  onRemove
}: BlockRowProps) {
  const { t } = useTranslation('pageEditor')
  const { locales } = useEditingLocale()
  return (
    <li
      ref={slot?.ref}
      data-block-id={block.id}
      tabIndex={-1}
      className={cn(
        'rounded-lg border bg-card shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        slot?.dragging && 'z-10 shadow-lg ring-2 ring-ring/24'
      )}
    >
      <Collapsible>
        <div className="flex items-center gap-1 p-1">
          {slot?.handle}
          <span
            className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums"
            aria-hidden
          >
            {position}
          </span>
          {option ? (
            <CollapsibleTrigger
              aria-label={t('block.edit', { name })}
              className="group flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1.5 text-left font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRightIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90"
                aria-hidden
              />
              <span className="truncate">{name}</span>
            </CollapsibleTrigger>
          ) : (
            <span className="min-w-0 flex-1 truncate px-1 font-medium text-sm">{name}</span>
          )}
          <IconButton label={t('block.duplicate', { name })} variant="ghost" onClick={onDuplicate}>
            <CopyIcon />
          </IconButton>
          <IconButton label={t('block.remove', { name })} variant="ghost" onClick={onRemove}>
            <Trash2Icon />
          </IconButton>
        </div>
        {option && (
          <CollapsiblePanel>
            <div className="border-t p-4">
              <BlockForm
                schema={option.schema}
                locales={locales}
                value={block.content as BlockValue}
                onChange={onChange}
                className="max-w-none"
              />
            </div>
          </CollapsiblePanel>
        )}
      </Collapsible>
    </li>
  )
}

function BlockPicker({
  options,
  onPick
}: {
  options: BlockOption[]
  onPick: (b: BlockOption) => void
}) {
  const { t } = useTranslation('pageEditor')
  return (
    <Menu>
      <MenuTrigger
        data-picker
        render={<Button variant="outline" disabled={options.length === 0} />}
      >
        <PlusIcon aria-hidden />
        {t('picker.add')}
      </MenuTrigger>
      <MenuPopup align="start" aria-label={t('picker.label')}>
        {options.map((option) => (
          <MenuItem key={option.name} onClick={() => onPick(option)}>
            {option.name}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  )
}

function useSave(pageId: string, draft: PageDraft, saved: SavedPage) {
  const { t } = useTranslation('pageEditor')
  const queryClient = useQueryClient()
  const saveBlocks = useMutation(savePageBlocksMutation(queryClient, pageId))
  const saveLayout = useMutation(savePageLayoutMutation(queryClient, pageId))
  const saveSeo = useMutation(savePageSeoMutation(queryClient, pageId))
  const error = saveBlocks.error ?? saveLayout.error ?? saveSeo.error
  const stale =
    error instanceof ApiError && error.code === API_ERROR.staleVersion.code ? error : undefined
  const failure =
    error && !stale
      ? t(`errors.${error instanceof ApiError ? error.code : 'internal'}`, {
          defaultValue: t('errors.internal')
        })
      : undefined
  const save = async () => {
    saveBlocks.reset()
    saveLayout.reset()
    saveSeo.reset()
    try {
      let expectedVersion = saved.version
      if (!sameBlocks(draft.blocks, saved.blocks)) {
        const result = await saveBlocks.mutateAsync({ blocks: draft.blocks, expectedVersion })
        expectedVersion = result.version
      }
      if (draft.layout !== saved.layout) {
        const result = await saveLayout.mutateAsync({ layout: draft.layout, expectedVersion })
        expectedVersion = result.version
      }
      if (!sameJson(draft.seo, saved.seo)) {
        await saveSeo.mutateAsync({ seo: draft.seo, expectedVersion })
      }
    } catch {
      return
    }
  }
  return {
    save,
    saving: saveBlocks.isPending || saveLayout.isPending || saveSeo.isPending,
    failure,
    stale: stale && { current: stale.current }
  }
}

function useRowFeedback(blocks: PageBlock[]) {
  const [announcement, setAnnouncement] = useState('')
  const pendingFocus = useRef<string | undefined>(undefined)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = pendingFocus.current
    if (id === undefined) return
    pendingFocus.current = undefined
    const row = listRef.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
    const picker = listRef.current?.parentElement?.querySelector<HTMLElement>('[data-picker]')
    ;(row ?? picker)?.focus()
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [blocks])
  return {
    announcement,
    announce: setAnnouncement,
    listRef,
    focusRow: (id = '') => {
      pendingFocus.current = id
    }
  }
}

function useBlockActions(saved: PageBlock[]) {
  const { t } = useTranslation('pageEditor')
  const [blocks, setBlocks] = useState(saved)
  const feedback = useRowFeedback(blocks)
  const names = blocks.map((block) => block.block)

  const apply = (next: PageBlock[], message: string, focusId?: string) => {
    setBlocks(next)
    feedback.announce(message)
    feedback.focusRow(focusId)
  }
  const add = (option: BlockOption) => {
    const created = newBlock(option)
    const total = blocks.length + 1
    const message = t('announce.added', { name: option.name, position: total, total })
    apply([...blocks, created], message, created.id)
  }
  const duplicate = (index: number) => {
    const next = duplicateAt(blocks, index)
    const message = t('announce.duplicated', {
      name: names[index],
      position: index + 2,
      total: next.length
    })
    apply(next, message, next[index + 1]?.id)
  }
  const remove = (index: number) => {
    const next = removeAt(blocks, index)
    const message = t('announce.removed', { name: names[index], total: next.length })
    apply(next, message, (next[index] ?? next[index - 1])?.id)
  }
  const edit = (id: string, content: BlockValue) =>
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, content: content as PageBlock['content'] } : block
      )
    )
  const move = (from: number, to: number) => setBlocks((current) => moveBlock(current, from, to))

  return { blocks, names, add, duplicate, remove, move, edit, ...feedback }
}

interface EditorHeaderProps {
  title: string
  dirty: boolean
  saving: boolean
  failure?: string
  stale?: { current?: PageStamp }
  onSave: () => void
  onReload: () => void
}

function EditorHeader({
  title,
  dirty,
  saving,
  failure,
  stale,
  onSave,
  onReload
}: EditorHeaderProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/pages"
        className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {t('back')}
      </Link>
      <PageHeader
        title={title}
        actions={
          <div className="flex items-center gap-3">
            {dirty && <Badge variant="warning">{t('unsaved')}</Badge>}
            <Button onClick={onSave} disabled={!dirty || saving}>
              {saving ? <Spinner /> : <SaveIcon aria-hidden />}
              {t('save')}
            </Button>
          </div>
        }
      />
      {stale && <StaleAlert current={stale.current} onReload={onReload} />}
      {failure && (
        <p role="alert" className="text-destructive-foreground text-sm">
          {failure}
        </p>
      )}
    </div>
  )
}

function LayoutPicker({
  layouts,
  value,
  onChange
}: {
  layouts: string[]
  value: string
  onChange: (layout: string) => void
}) {
  const { t } = useTranslation('pageEditor')
  return (
    <ChoiceSelect
      label={t('layout.label')}
      description={t('layout.description')}
      value={value}
      options={layouts.map((name) => ({
        value: name,
        label: t(`layout.names.${name}`, { defaultValue: name })
      }))}
      onChange={onChange}
    />
  )
}

function EmptyBlocks() {
  const { t } = useTranslation('pageEditor')
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t('empty.title')}</EmptyTitle>
        <EmptyDescription>{t('empty.description')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

interface PageEditorBodyProps {
  pageId: string
  onReload: () => void
}

function BlockList({
  actions,
  options
}: {
  actions: ReturnType<typeof useBlockActions>
  options: BlockOption[]
}) {
  const { blocks, names, listRef } = actions
  const renderRow = (key: string, index: number, slot?: SortableSlot) => (
    <BlockRow
      key={key}
      block={blocks[index]!}
      name={names[index]!}
      option={options.find((option) => option.name === names[index])}
      position={index + 1}
      slot={slot}
      onChange={(content) => actions.edit(blocks[index]!.id, content)}
      onDuplicate={() => actions.duplicate(index)}
      onRemove={() => actions.remove(index)}
    />
  )
  return (
    <div ref={listRef} className="contents">
      {blocks.length === 0 ? (
        <EmptyBlocks />
      ) : (
        <Suspense
          fallback={
            <ul className="flex flex-col gap-2">
              {blocks.map((block, index) => renderRow(block.id, index))}
            </ul>
          }
        >
          <SortableItems keys={blocks.map((block) => block.id)} names={names} onMove={actions.move}>
            {renderRow}
          </SortableItems>
        </Suspense>
      )}
    </div>
  )
}

function useSeoDefaults(titles: Record<string, string>): SeoDefaults {
  const { data: settings } = useSuspenseQuery(settingsQuery)
  return {
    titles,
    siteNames: settings.siteName,
    hasSocialImage: settings.defaultSocialImage !== undefined
  }
}

function PageEditorBody({ pageId, onReload }: PageEditorBodyProps) {
  const { t, i18n } = useTranslation('pageEditor')
  const { data: savedPage } = useSuspenseQuery(pageBlocksQuery(pageId))
  const saved = savedPage.blocks
  const { data: options } = useSuspenseQuery(blockDescriptionsQuery)
  const { data: pages } = useSuspenseQuery(pagesQuery)
  const { data: layouts } = useSuspenseQuery(layoutsQuery)
  const page = pages.find((candidate) => candidate.id === pageId)
  const { data: savedSeoPage } = useSuspenseQuery(pageSeoQuery(pageId))
  const savedSeo = savedSeoPage.seo
  const savedLayout = savedPage.layout
  const [layout, setLayout] = useState(savedLayout)
  const [seo, setSeo] = useState(savedSeo)
  const defaults = useSeoDefaults(
    Object.fromEntries((page?.locales ?? []).map(({ locale, title }) => [locale, title]))
  )
  const actions = useBlockActions(saved)
  const { blocks } = actions
  const [locale, setLocale] = useState<Locale>(LOCALES[0])
  const editing = useMemo(
    () => ({ locales: LOCALES, active: locale, fallback: LOCALES[0] }),
    [locale]
  )
  const dirty = !sameBlocks(blocks, saved) || layout !== savedLayout || !sameJson(seo, savedSeo)
  const { save, saving, failure, stale } = useSave(
    pageId,
    { blocks, layout, seo },
    { blocks: saved, layout: savedLayout, seo: savedSeo, version: savedPage.version }
  )

  return (
    <EditingLocaleContext.Provider value={editing}>
      <EditorHeader
        title={page ? pageLabel(page, i18n.language) : t('title')}
        dirty={dirty}
        saving={saving}
        failure={failure}
        stale={stale}
        onSave={() => void save()}
        onReload={onReload}
      />
      <LeaveGuard dirty={dirty} />
      {page && (
        <PublishPanel
          page={page}
          name={pageLabel(page, i18n.language)}
          version={savedPage.version}
          blocks={saved}
          dirty={dirty}
        />
      )}
      <LocaleSwitcher
        locales={LOCALES}
        active={locale}
        status={localeGaps(blocks, options, seo)}
        showInvalid={false}
        onChange={(next) => setLocale(next as Locale)}
      />
      <LayoutPicker layouts={layouts} value={layout} onChange={setLayout} />
      <BlockList actions={actions} options={options} />
      <div>
        <BlockPicker options={options} onPick={actions.add} />
      </div>
      <SeoSection value={seo} defaults={defaults} onChange={setSeo} />
      <p role="status" aria-live="polite" className="sr-only">
        {actions.announcement}
      </p>
    </EditingLocaleContext.Provider>
  )
}

export function PageEditor({ pageId }: { pageId: string }) {
  const queryClient = useQueryClient()
  const [generation, setGeneration] = useState(0)
  const reload = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pageBlocksKey(pageId) }),
      queryClient.invalidateQueries({ queryKey: pageSeoKey(pageId) }),
      queryClient.invalidateQueries({ queryKey: ['pages'], exact: true })
    ])
    setGeneration((current) => current + 1)
  }
  return <PageEditorBody key={generation} pageId={pageId} onReload={() => void reload()} />
}
