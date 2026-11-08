import type { ComponentType } from 'react'
import { z } from 'zod'

export interface BlockDefinition<S extends z.ZodType = z.ZodType> {
  /** Stable key stored with each block on a page. Never rename it once content exists. */
  name: string
  /** Bump when `schema` changes in a way saved content would not satisfy (BLK-5). */
  version?: number
  schema: S
  component: ComponentType<z.output<S>>
  /** Upgrades content saved at `fromVersion` to the current schema. */
  migrate?: (content: unknown, fromVersion: number) => unknown
}

export interface Block<S extends z.ZodType = z.ZodType> extends BlockDefinition<S> {
  version: number
}

/** Defines a block: a zod schema plus the React component that renders its content. */
export function defineBlock<S extends z.ZodType>(definition: BlockDefinition<S>): Block<S> {
  if (!/^[a-z][a-z0-9-]*$/.test(definition.name)) {
    throw new Error(`Block name "${definition.name}" must be lowercase letters, digits and hyphens`)
  }
  return { ...definition, version: definition.version ?? 1 }
}

export interface Registry {
  readonly blocks: ReadonlyMap<string, Block>
  get(name: string): Block | undefined
  /** The block's schema as JSON Schema, with the field markers; what the admin API serves. */
  jsonSchema(name: string): z.core.JSONSchema.BaseSchema
}

/** The one registry both Workers import. Only the registry differs between sites (ADR-0003). */
// `any`: a block's component takes its own props, so no single Block<S> accepts them all.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineRegistry(blocks: readonly Block<any>[]): Registry {
  const byName = new Map<string, Block>()
  for (const block of blocks) {
    if (byName.has(block.name)) throw new Error(`Block "${block.name}" is registered twice`)
    byName.set(block.name, block)
  }
  return {
    blocks: byName,
    get: (name) => byName.get(name),
    jsonSchema(name) {
      const block = byName.get(name)
      if (!block) throw new Error(`Unknown block "${name}"`)
      return z.toJSONSchema(block.schema, { io: 'input' })
    }
  }
}
