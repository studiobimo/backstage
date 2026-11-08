import type { PageBlock } from '@studiobimo/backstage'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CopyIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IconButton } from '@/components/icon-button'
import type { SortableSlot } from '@/components/sortable-items'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import { pageLabel } from '../pages/page-label'
import { pagesQuery } from '../pages/queries'
import { type BlockOption, duplicateAt, moveBlock, newBlock, removeAt, sameBlocks } from './draft'
import { blockDescriptionsQuery, pageBlocksQuery, savePageBlocksMutation } from './queries'

const SortableItems = lazy(() => import('@/components/sortable-items'))

interface BlockRowProps {
  block: PageBlock
  name: string
  position: number
  slot?: SortableSlot
  onDuplicate: () => void
  onRemove: () => void
}

function BlockRow({ block, name, position, slot, onDuplicate, onRemove }: BlockRowProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <li
      ref={slot?.ref}
      data-block-id={block.id}
      tabIndex={-1}
      className={cn(
        'flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        slot?.dragging && 'z-10 shadow-lg ring-2 ring-ring/24'
      )}
    >
      {slot?.handle}
      <span
        className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums"
        aria-hidden
      >
        {position}
      </span>
      <span className="min-w-0 flex-1 truncate px-1 font-medium text-sm">{name}</span>
      <IconButton label={t('block.duplicate', { name })} variant="ghost" onClick={onDuplicate}>
        <CopyIcon />
      </IconButton>
      <IconButton label={t('block.remove', { name })} variant="ghost" onClick={onRemove}>
        <Trash2Icon />
      </IconButton>
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

function useSave(pageId: string, blocks: PageBlock[]) {
  const { t } = useTranslation('pageEditor')
  const mutation = useMutation(savePageBlocksMutation(useQueryClient(), pageId))
  const failure = mutation.error
    ? t(`errors.${mutation.error instanceof ApiError ? mutation.error.code : 'internal'}`, {
        defaultValue: t('errors.internal')
      })
    : undefined
  return { save: () => mutation.mutate(blocks), saving: mutation.isPending, failure }
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
  const move = (from: number, to: number) => setBlocks((current) => moveBlock(current, from, to))

  return { blocks, names, add, duplicate, remove, move, ...feedback }
}

interface EditorHeaderProps {
  title: string
  dirty: boolean
  saving: boolean
  failure?: string
  onSave: () => void
}

function EditorHeader({ title, dirty, saving, failure, onSave }: EditorHeaderProps) {
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
      {failure && (
        <p role="alert" className="text-destructive-foreground text-sm">
          {failure}
        </p>
      )}
    </div>
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

export function PageEditor({ pageId }: { pageId: string }) {
  const { t, i18n } = useTranslation('pageEditor')
  const { data: saved } = useSuspenseQuery(pageBlocksQuery(pageId))
  const { data: options } = useSuspenseQuery(blockDescriptionsQuery)
  const { data: pages } = useSuspenseQuery(pagesQuery)
  const actions = useBlockActions(saved)
  const { blocks, names, listRef } = actions
  const { save, saving, failure } = useSave(pageId, blocks)
  const page = pages.find((candidate) => candidate.id === pageId)

  const renderRow = (key: string, index: number, slot?: SortableSlot) => (
    <BlockRow
      key={key}
      block={blocks[index]!}
      name={names[index]!}
      position={index + 1}
      slot={slot}
      onDuplicate={() => actions.duplicate(index)}
      onRemove={() => actions.remove(index)}
    />
  )

  return (
    <>
      <EditorHeader
        title={page ? pageLabel(page, i18n.language) : t('title')}
        dirty={!sameBlocks(blocks, saved)}
        saving={saving}
        failure={failure}
        onSave={save}
      />
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
            <SortableItems
              keys={blocks.map((block) => block.id)}
              names={names}
              onMove={actions.move}
            >
              {renderRow}
            </SortableItems>
          </Suspense>
        )}
      </div>
      <div>
        <BlockPicker options={options} onPick={actions.add} />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {actions.announcement}
      </p>
    </>
  )
}
