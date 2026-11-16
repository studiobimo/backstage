import type { ComponentType, JSXElementConstructor, ReactNode } from 'react'
import type { z } from 'zod'

import type { Block, CollectionRegistry, LayoutDefinition, Registry } from './blocks.ts'
import type { AdminRegistry, Collection, RoutedCollection } from './collections.ts'

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

export type CollectionComponents<C extends readonly Collection[]> = {
  [K in C[number] as K extends RoutedCollection ? K['name'] : never]: ComponentType<
    z.output<K['schema']>
  >
}

type CollectionTemplates<C extends readonly Collection[]> =
  keyof CollectionComponents<C> extends never
    ? { collections?: CollectionComponents<C> }
    : { collections: CollectionComponents<C> }

export interface ComponentMap {
  readonly registry: AdminRegistry
  readonly blocks: Readonly<Record<string, JSXElementConstructor<never>>>
  readonly layouts: Readonly<Record<string, ComponentType<LayoutProps>>>
  readonly collections?: Readonly<Record<string, JSXElementConstructor<never>>>
}

export function defineComponents<
  const B extends readonly Block[],
  const L extends readonly LayoutDefinition[],
  const C extends readonly Collection[] = readonly []
>(
  registry: Registry<B, L> & Partial<CollectionRegistry<C>>,
  components: { blocks: BlockComponents<B>; layouts: LayoutComponents<L> } & CollectionTemplates<C>
): ComponentMap {
  return { registry, ...components }
}
