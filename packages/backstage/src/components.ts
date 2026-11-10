import type { ComponentType, JSXElementConstructor, ReactNode } from 'react'
import type { z } from 'zod'

import type { Block, LayoutDefinition, Registry } from './blocks.ts'

export interface LayoutProps {
  slots: Readonly<Record<string, ReactNode>>
  children: ReactNode
}

export type BlockComponents<B extends readonly Block[]> = {
  [K in B[number] as K['name']]: ComponentType<z.output<K['schema']>>
}

export type LayoutComponents<L extends readonly LayoutDefinition[]> = {
  [K in L[number] as K['name']]: ComponentType<LayoutProps>
}

export interface ComponentMap {
  readonly registry: Registry
  readonly blocks: Readonly<Record<string, JSXElementConstructor<never>>>
  readonly layouts: Readonly<Record<string, ComponentType<LayoutProps>>>
}

export function defineComponents<
  const B extends readonly Block[],
  const L extends readonly LayoutDefinition[]
>(
  registry: Registry<B, L>,
  components: { blocks: BlockComponents<B>; layouts: LayoutComponents<L> }
): ComponentMap {
  return { registry, ...components }
}
