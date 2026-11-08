import type { ComponentType, JSXElementConstructor, ReactNode } from 'react'
import { z } from 'zod'

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/

export interface BlockDefinition<S extends z.ZodType = z.ZodType> {
  name: string
  version?: number
  schema: S
  component: ComponentType<z.output<S>>
  migrate?: (content: unknown, fromVersion: number) => unknown
}

export interface Block<S extends z.ZodType = z.ZodType> extends BlockDefinition<S> {
  version: number
}

export function defineBlock<S extends z.ZodType>(definition: BlockDefinition<S>): Block<S> {
  if (!NAME_PATTERN.test(definition.name)) {
    throw new Error(`Block name "${definition.name}" must be lowercase letters, digits and hyphens`)
  }
  return { ...definition, version: definition.version ?? 1 }
}

export interface RegisteredBlock extends Omit<Block, 'component'> {
  component: JSXElementConstructor<never>
}

export const LAYOUT = { default: 'default' } as const
export const SLOT = { header: 'header', footer: 'footer' } as const

export interface LayoutProps {
  slots: Readonly<Record<string, ReactNode>>
  children: ReactNode
}

export interface LayoutDefinition {
  name: string
  component: ComponentType<LayoutProps>
}

export interface RegisteredLayout {
  name: string
  component: JSXElementConstructor<never>
}

export function defineLayout(definition: LayoutDefinition): LayoutDefinition {
  if (!NAME_PATTERN.test(definition.name)) {
    throw new Error(
      `Layout name "${definition.name}" must be lowercase letters, digits and hyphens`
    )
  }
  return definition
}

export interface RegistryOptions {
  slots?: Readonly<Record<string, readonly string[]>>
  layouts?: readonly RegisteredLayout[]
}

export interface Registry {
  readonly blocks: ReadonlyMap<string, RegisteredBlock>
  readonly slots: ReadonlyMap<string, readonly string[]>
  readonly layouts: ReadonlyMap<string, RegisteredLayout>
  get(name: string): RegisteredBlock | undefined
  isSlotBlock(name: string): boolean
  hasLayout(name: string): boolean
  jsonSchema(name: string): z.core.JSONSchema.BaseSchema
}

function indexByName<T extends { name: string }>(items: readonly T[], kind: string) {
  const byName = new Map<string, T>()
  for (const item of items) {
    if (byName.has(item.name)) throw new Error(`${kind} "${item.name}" is registered twice`)
    byName.set(item.name, item)
  }
  return byName
}

function indexSlots(
  slots: NonNullable<RegistryOptions['slots']>,
  blocks: ReadonlyMap<string, RegisteredBlock>
) {
  const bySlot = new Map<string, readonly string[]>()
  for (const [slot, names] of Object.entries(slots)) {
    if (!NAME_PATTERN.test(slot)) {
      throw new Error(`Slot name "${slot}" must be lowercase letters, digits and hyphens`)
    }
    if (names.length === 0) throw new Error(`Slot "${slot}" needs at least one block`)
    for (const name of names) {
      if (!blocks.has(name)) throw new Error(`Slot "${slot}" names the unknown block "${name}"`)
    }
    bySlot.set(slot, [...names])
  }
  return bySlot
}

export function defineRegistry(
  blocks: readonly RegisteredBlock[],
  { slots = {}, layouts = [] }: RegistryOptions = {}
): Registry {
  const byName = indexByName(blocks, 'Block')
  const bySlot = indexSlots(slots, byName)
  const slotBlocks = new Set([...bySlot.values()].flat())
  const layoutsByName = indexByName(layouts, 'Layout')
  return {
    blocks: byName,
    slots: bySlot,
    layouts: layoutsByName,
    get: (name) => byName.get(name),
    isSlotBlock: (name) => slotBlocks.has(name),
    hasLayout: (name) => name === LAYOUT.default || layoutsByName.has(name),
    jsonSchema(name) {
      const block = byName.get(name)
      if (!block) throw new Error(`Unknown block "${name}"`)
      return z.toJSONSchema(block.schema, { io: 'input' })
    }
  }
}

export const layoutNames = (registry: Registry): string[] => [
  LAYOUT.default,
  ...[...registry.layouts.keys()].filter((name) => name !== LAYOUT.default)
]

export interface BlockDescription {
  name: string
  version: number
  schema: z.core.JSONSchema.BaseSchema
}

const describe = (registry: Registry, block: RegisteredBlock): BlockDescription => ({
  name: block.name,
  version: block.version,
  schema: registry.jsonSchema(block.name)
})

export function describeBlocks(registry: Registry): BlockDescription[] {
  return [...registry.blocks.values()]
    .filter(({ name }) => !registry.isSlotBlock(name))
    .map((block) => describe(registry, block))
}

export interface SlotDescription {
  name: string
  blocks: BlockDescription[]
}

export function describeSlots(registry: Registry): SlotDescription[] {
  return [...registry.slots].map(([name, blockNames]) => ({
    name,
    blocks: blockNames.map((blockName) => describe(registry, registry.blocks.get(blockName)!))
  }))
}

export type BlockContentResult =
  { ok: true; schemaVersion: number; content: unknown } | { ok: false }

export function upgradeBlockContent(
  block: RegisteredBlock,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  if (schemaVersion > block.version) return { ok: false }
  const upgraded =
    schemaVersion < block.version && block.migrate ? block.migrate(content, schemaVersion) : content
  return { ok: true, schemaVersion: block.version, content: upgraded }
}

export function validateBlockContent(
  block: RegisteredBlock,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  const upgraded = upgradeBlockContent(block, schemaVersion, content)
  if (!upgraded.ok) return upgraded
  const parsed = block.schema.safeParse(upgraded.content)
  return parsed.success ? { ...upgraded, content: parsed.data } : { ok: false }
}
