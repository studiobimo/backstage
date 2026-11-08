import type { PageBlock } from '@studiobimo/backstage'

import { type JsonSchema, parseBlockSchema } from '../block-form/spec'
import { initialGroup } from '../block-form/value'

export interface BlockOption {
  name: string
  version: number
  schema: JsonSchema
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

export const sameBlocks = (a: PageBlock[], b: PageBlock[]) =>
  JSON.stringify(a) === JSON.stringify(b)
