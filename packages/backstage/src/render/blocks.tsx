import type { ComponentType } from 'react'

import { validateBlockContent } from '../blocks.ts'
import type { ComponentMap } from '../components.ts'
import { logLine } from '../log.ts'
import type { PageBlock } from '../pages.ts'
import type { Snapshot } from '../publishing.ts'
import { mapMarkedFields, type TranslatedNode } from '../translations.ts'

interface BlocksProps {
  components: ComponentMap
  snapshot: Pick<Snapshot, 'blocks' | 'pageId'> & Partial<Pick<Snapshot, 'entries' | 'references'>>
}

const BLOCK_DROP = {
  message: 'block dropped',
  reason: {
    unknownBlock: 'unknown_block',
    slotBlock: 'slot_block',
    invalidContent: 'invalid_content',
    missingComponent: 'missing_component'
  }
} as const

type DropReason = (typeof BLOCK_DROP.reason)[keyof typeof BLOCK_DROP.reason]

const dropBlock = (pageId: string, block: PageBlock, reason: DropReason) => {
  logLine('error', BLOCK_DROP.message, { pageId, blockId: block.id, block: block.block, reason })
  return []
}

const withEntries = (
  node: TranslatedNode,
  content: unknown,
  { entries = {}, references = {} }: BlocksProps['snapshot'],
  blockId: string
) =>
  references[blockId]
    ? mapMarkedFields(node, content, 'reference', ({ path, node: field }) =>
        (references[blockId]?.[path] ?? []).flatMap((id) => {
          const entry = entries[field.collection ?? '']?.[id]
          return entry ? [{ id, content: entry.content, slug: entry.slug, href: entry.href }] : []
        })
      )
    : content

export function Blocks({ components, snapshot }: BlocksProps) {
  const { registry } = components
  const { pageId } = snapshot
  return snapshot.blocks.flatMap((block) => {
    const definition = registry.get(block.block)
    if (!definition) return dropBlock(pageId, block, BLOCK_DROP.reason.unknownBlock)
    if (registry.isSlotBlock(block.block)) {
      return dropBlock(pageId, block, BLOCK_DROP.reason.slotBlock)
    }
    const result = validateBlockContent(definition, block.schemaVersion, block.content)
    if (!result.ok) return dropBlock(pageId, block, BLOCK_DROP.reason.invalidContent)
    const Component = components.blocks[definition.name] as
      ComponentType<Record<string, unknown>> | undefined
    if (!Component) return dropBlock(pageId, block, BLOCK_DROP.reason.missingComponent)
    return [
      <Component
        key={block.id}
        {...(withEntries(
          registry.jsonSchema(definition.name),
          result.content,
          snapshot,
          block.id
        ) as Record<string, unknown>)}
      />
    ]
  })
}
