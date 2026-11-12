import {
  countMissingTranslations,
  isSeoMissing,
  type Locale,
  type PageBlock,
  type PageSeo
} from '@studiobimo/backstage'

import { type JsonSchema, parseBlockSchema } from '../block-form/spec'
import type { LocaleStatus } from '../block-form/locale-status'
import { initialGroup } from '../block-form/value'

export interface PageDraft {
  blocks: PageBlock[]
  layout: string
  seo: PageSeo
}

export interface DraftChange {
  kind: 'added' | 'removed' | 'edited' | 'reordered' | 'layout' | 'seo'
  name?: string
  position?: number
}

export interface BlockOption {
  name: string
  version: number
  schema: JsonSchema
  title?: Record<string, string>
  description?: Record<string, string>
}

export const newBlock = (description: BlockOption): PageBlock => ({
  id: crypto.randomUUID(),
  block: description.name,
  schemaVersion: description.version,
  content: JSON.parse(JSON.stringify(initialGroup(parseBlockSchema(description.schema))))
})

export const duplicateAt = (blocks: PageBlock[], index: number): PageBlock[] => {
  const original = blocks[index]
  if (!original) return blocks
  const copy = { ...original, id: crypto.randomUUID(), content: structuredClone(original.content) }
  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]
}

export const removeAt = (blocks: PageBlock[], index: number): PageBlock[] =>
  blocks.filter((_, position) => position !== index)

export const moveBlock = (blocks: PageBlock[], from: number, to: number): PageBlock[] => {
  const next = [...blocks]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const sameBlocks = (a: PageBlock[], b: PageBlock[]) => sameJson(a, b)

const blocksMissing = (blocks: PageBlock[], options: BlockOption[], locale: Locale) =>
  blocks.reduce((total, { block, content }) => {
    const option = options.find((candidate) => candidate.name === block)
    return option ? total + countMissingTranslations(option.schema, content, locale) : total
  }, 0)

export const localeGaps = (
  blocks: PageBlock[],
  options: BlockOption[],
  seo: PageSeo,
  locales: readonly Locale[]
): Record<Locale, LocaleStatus> =>
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        missing: blocksMissing(blocks, options, locale) + (isSeoMissing(seo, locale) ? 1 : 0),
        invalid: 0
      }
    ])
  ) as Record<Locale, LocaleStatus>

const blockChanges = (saved: PageBlock[], draft: PageBlock[]): DraftChange[] => {
  const savedById = new Map(saved.map((block, index) => [block.id, { block, index }]))
  const draftIds = new Set(draft.map((block) => block.id))
  const removed = saved.flatMap((block, index): DraftChange[] =>
    draftIds.has(block.id) ? [] : [{ kind: 'removed', name: block.block, position: index + 1 }]
  )
  const others = draft.flatMap((block, index): DraftChange[] => {
    const before = savedById.get(block.id)
    if (!before) return [{ kind: 'added', name: block.block, position: index + 1 }]
    return sameJson(before.block.content, block.content)
      ? []
      : [{ kind: 'edited', name: block.block, position: index + 1 }]
  })
  const keptSaved = saved.filter((block) => draftIds.has(block.id)).map((block) => block.id)
  const keptDraft = draft.filter((block) => savedById.has(block.id)).map((block) => block.id)
  const reordered: DraftChange[] = sameJson(keptSaved, keptDraft) ? [] : [{ kind: 'reordered' }]
  return [...removed, ...others, ...reordered]
}

export const describeChanges = (saved: PageDraft, draft: PageDraft): DraftChange[] => [
  ...blockChanges(saved.blocks, draft.blocks),
  ...(saved.layout === draft.layout ? [] : [{ kind: 'layout' as const }]),
  ...(sameJson(saved.seo, draft.seo) ? [] : [{ kind: 'seo' as const }])
]
