import type { ComponentType, JSXElementConstructor } from 'react'
import { z } from 'zod'

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
  if (!/^[a-z][a-z0-9-]*$/.test(definition.name)) {
    throw new Error(`Block name "${definition.name}" must be lowercase letters, digits and hyphens`)
  }
  return { ...definition, version: definition.version ?? 1 }
}

export interface RegisteredBlock extends Omit<Block, 'component'> {
  component: JSXElementConstructor<never>
}

export interface Registry {
  readonly blocks: ReadonlyMap<string, RegisteredBlock>
  get(name: string): RegisteredBlock | undefined
  jsonSchema(name: string): z.core.JSONSchema.BaseSchema
}

export function defineRegistry(blocks: readonly RegisteredBlock[]): Registry {
  const byName = new Map<string, RegisteredBlock>()
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
