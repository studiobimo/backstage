import { z } from 'zod'

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/

export const siteOriginResponseSchema = z.object({ origin: z.url() })

export const BLOCK_PREVIEW = { path: '/__preview/blocks', localeParam: 'locale' } as const

export interface BlockDefinition<S extends z.ZodType = z.ZodType, N extends string = string> {
  name: N
  version?: number
  schema: S
  migrate?: (content: unknown, fromVersion: number) => unknown
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
  thumbnail?: Readonly<Record<string, string>>
}

export interface Block<
  S extends z.ZodType = z.ZodType,
  N extends string = string
> extends BlockDefinition<S, N> {
  version: number
}

export function defineBlock<S extends z.ZodType, const N extends string>(
  definition: BlockDefinition<S, N>
): Block<S, N> {
  if (!NAME_PATTERN.test(definition.name)) {
    throw new Error(`Block name "${definition.name}" must be lowercase letters, digits and hyphens`)
  }
  return { ...definition, version: definition.version ?? 1 }
}

export const LAYOUT = { default: 'default' } as const
export const SLOT = { header: 'header', footer: 'footer' } as const

export interface LayoutDefinition<N extends string = string> {
  name: N
}

export function defineLayout<const N extends string>(
  definition: LayoutDefinition<N>
): LayoutDefinition<N> {
  if (!NAME_PATTERN.test(definition.name)) {
    throw new Error(
      `Layout name "${definition.name}" must be lowercase letters, digits and hyphens`
    )
  }
  return definition
}

export interface RegistryOptions<
  L extends readonly LayoutDefinition[] = readonly LayoutDefinition[]
> {
  slots?: Readonly<Record<string, readonly string[]>>
  layouts?: L
}

export interface Registry<
  B extends readonly Block[] = readonly Block[],
  L extends readonly LayoutDefinition[] = readonly LayoutDefinition[]
> {
  readonly __types?: { readonly blocks: B; readonly layouts: L }
  readonly blocks: ReadonlyMap<string, Block>
  readonly slots: ReadonlyMap<string, readonly string[]>
  readonly layouts: ReadonlyMap<string, LayoutDefinition>
  get(name: string): Block | undefined
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
  blocks: ReadonlyMap<string, Block>
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

export function defineRegistry<
  const B extends readonly Block[],
  const L extends readonly LayoutDefinition[] = readonly []
>(blocks: B, options: RegistryOptions<L> = {}): Registry<B, L> {
  const { slots = {}, layouts = [] as unknown as L } = options
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
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
  thumbnail?: Readonly<Record<string, string>>
}

const describe = (registry: Registry, block: Block): BlockDescription => ({
  name: block.name,
  version: block.version,
  schema: registry.jsonSchema(block.name),
  title: block.title,
  description: block.description,
  thumbnail: block.thumbnail
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
  block: Block,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  if (schemaVersion > block.version) return { ok: false }
  const upgraded =
    schemaVersion < block.version && block.migrate ? block.migrate(content, schemaVersion) : content
  return { ok: true, schemaVersion: block.version, content: upgraded }
}

export function validateBlockContent(
  block: Block,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  const upgraded = upgradeBlockContent(block, schemaVersion, content)
  if (!upgraded.ok) return upgraded
  const parsed = block.schema.safeParse(upgraded.content)
  return parsed.success ? { ...upgraded, content: parsed.data } : { ok: false }
}
