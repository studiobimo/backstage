import { z } from 'zod'

import { fieldIssuesOf, type FieldIssue } from './errors.ts'
import { unrenderableFieldIn, type SchemaNode } from './field-shapes.ts'
import { resolveLocaleConfig, type LocaleConfig } from './locales.ts'

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/

export const siteOriginResponseSchema = z.object({ origin: z.url() })

export const PREVIEW_ROOT = '/__preview'

export const BLOCK_PREVIEW = {
  path: `${PREVIEW_ROOT}/blocks`,
  localeParam: 'locale',
  thumbnailFile: 'thumbnail.svg'
} as const

export const blockThumbnailUrl = (siteOrigin: string, blockName: string) =>
  `${siteOrigin}${BLOCK_PREVIEW.path}/${blockName}/${BLOCK_PREVIEW.thumbnailFile}`

export interface BlockDefinition<S extends z.ZodType = z.ZodType, N extends string = string> {
  name: N
  version?: number
  schema: S
  migrate?: (content: unknown, fromVersion: number) => unknown
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
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
> extends Partial<LocaleConfig> {
  slots?: Readonly<Record<string, readonly string[]>>
  layouts?: L
}

export interface Registry<
  B extends readonly Block[] = readonly Block[],
  L extends readonly LayoutDefinition[] = readonly LayoutDefinition[]
> extends Partial<LocaleConfig> {
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

function assertRenderable(block: Block) {
  let schema: SchemaNode
  try {
    schema = z.toJSONSchema(block.schema, { io: 'input', cycles: 'throw' }) as SchemaNode
  } catch {
    throw new Error(
      `Block "${block.name}" has a schema the admin cannot describe (recursive or unrepresentable)`
    )
  }
  const field = unrenderableFieldIn(schema, '')
  if (field !== undefined) {
    throw new Error(
      `Block "${block.name}" field "${field || '(root)'}" uses a schema shape the admin form cannot render (unions, nullable and referenced fields are not supported)`
    )
  }
}

export function defineRegistry<
  const B extends readonly Block[],
  const L extends readonly LayoutDefinition[] = readonly []
>(blocks: B, options: RegistryOptions<L> = {}): Registry<B, L> {
  const { slots = {}, layouts = [] as unknown as L, ...localeOptions } = options
  const { locales, defaultLocale } = resolveLocaleConfig(localeOptions)
  const byName = indexByName(blocks, 'Block')
  byName.forEach(assertRenderable)
  const bySlot = indexSlots(slots, byName)
  const slotBlocks = new Set([...bySlot.values()].flat())
  const layoutsByName = indexByName(layouts, 'Layout')
  return {
    locales,
    defaultLocale,
    blocks: byName,
    slots: bySlot,
    layouts: layoutsByName,
    get: (name) => byName.get(name),
    isSlotBlock: (name) => slotBlocks.has(name),
    hasLayout: (name) => name === LAYOUT.default || layoutsByName.has(name),
    jsonSchema(name) {
      const block = byName.get(name)
      if (!block) throw new Error(`Unknown block "${name}"`)
      return z.toJSONSchema(block.schema, { io: 'input', cycles: 'throw' })
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
  schema: Readonly<Record<string, unknown>>
  title?: Readonly<Record<string, string>>
  description?: Readonly<Record<string, string>>
}

const describe = (registry: Registry, block: Block): BlockDescription => ({
  name: block.name,
  version: block.version,
  schema: registry.jsonSchema(block.name),
  title: block.title,
  description: block.description
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

export const CONTENT_FAILURE = {
  invalid: 'invalid',
  newerVersion: 'newer_version',
  migrationFailed: 'migration_failed'
} as const

type ContentFailure = (typeof CONTENT_FAILURE)[keyof typeof CONTENT_FAILURE]

export interface VersionedContentSchema {
  version: number
  schema: z.ZodType
  migrate?: (content: unknown, fromVersion: number) => unknown
}

export type BlockContentResult =
  | { ok: true; schemaVersion: number; content: unknown }
  | { ok: false; failure: ContentFailure; issues: FieldIssue[] }

const rootIssue = (failure: ContentFailure): FieldIssue => ({ path: [], code: failure })

const failed = (failure: ContentFailure, issues?: FieldIssue[]): BlockContentResult => ({
  ok: false,
  failure,
  issues: issues ?? [rootIssue(failure)]
})

export function upgradeBlockContent(
  block: VersionedContentSchema,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  if (schemaVersion > block.version) return failed(CONTENT_FAILURE.newerVersion)
  if (schemaVersion === block.version || !block.migrate) {
    return { ok: true, schemaVersion: block.version, content }
  }
  try {
    return {
      ok: true,
      schemaVersion: block.version,
      content: block.migrate(content, schemaVersion)
    }
  } catch {
    return failed(CONTENT_FAILURE.migrationFailed)
  }
}

export function validateBlockContent(
  block: VersionedContentSchema,
  schemaVersion: number,
  content: unknown
): BlockContentResult {
  const upgraded = upgradeBlockContent(block, schemaVersion, content)
  if (!upgraded.ok) return upgraded
  const parsed = block.schema.safeParse(upgraded.content)
  return parsed.success
    ? { ...upgraded, content: parsed.data }
    : failed(CONTENT_FAILURE.invalid, fieldIssuesOf(parsed.error))
}

export function openStoredContent(
  block: VersionedContentSchema,
  schemaVersion: number,
  content: unknown
): { schemaVersion: number; content: unknown } {
  const upgraded = upgradeBlockContent(block, schemaVersion, content)
  return upgraded.ok
    ? { schemaVersion: upgraded.schemaVersion, content: upgraded.content }
    : { schemaVersion, content }
}
