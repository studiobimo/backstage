import type { ComponentType } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry } from './blocks.ts'
import { defineCollection } from './collections.ts'
import { defineComponents, type LayoutProps } from './components.ts'

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
const quote = defineBlock({ name: 'quote', schema: z.object({ by: z.string() }) })
const blocks = [note, quote] as const
const layouts = [defineLayout({ name: 'default' })] as const
const registry = defineRegistry(blocks, { layouts })
type Blocks = typeof blocks
type Layouts = typeof layouts

const Note = ({ text }: { text: string }) => <p>{text}</p>
const Quote = ({ by }: { by: string }) => <q>{by}</q>
const Layout = ({ children }: LayoutProps) => <main>{children}</main>

describe('defineComponents', () => {
  it('returns the components it was given', () => {
    const map = defineComponents(registry, {
      blocks: { note: Note, quote: Quote },
      layouts: { default: Layout }
    })
    expect(map.registry).toBe(registry)
    expect(map.blocks.note).toBe(Note)
    expect(map.layouts.default).toBe(Layout)
  })

  it('types its components exactly: every block and layout, with its own props', () => {
    type Components = Parameters<typeof defineComponents<Blocks, Layouts>>[1]
    expectTypeOf<Components['blocks']>().toEqualTypeOf<{
      note: ComponentType<{ text: string }>
      quote: ComponentType<{ by: string }>
    }>()
    expectTypeOf<Components['layouts']>().toEqualTypeOf<{
      default: ComponentType<LayoutProps>
    }>()
  })
})

describe('defineComponents with routed collections', () => {
  const article = defineCollection({
    name: 'article',
    label: 'title',
    route: { path: '/articles/:slug' },
    schema: z.object({ title: z.string() })
  })
  const faq = defineCollection({
    name: 'faq',
    label: 'question',
    schema: z.object({ question: z.string() })
  })
  const collections = [article, faq] as const
  type Collections = typeof collections
  const withCollections = defineRegistry([note], { layouts, collections })
  const Article = ({ title }: { title: string }) => <h1>{title}</h1>

  it('takes a template for each routed collection and none for the others', () => {
    const map = defineComponents(withCollections, {
      blocks: { note: Note },
      layouts: { default: Layout },
      collections: { article: Article }
    })
    expect(map.collections?.article).toBe(Article)
  })

  it('types its templates exactly: the routed collections only, with their own props', () => {
    type Components = Parameters<typeof defineComponents<Blocks, Layouts, Collections>>[1]
    expectTypeOf<Components['collections']>().toEqualTypeOf<{
      article: ComponentType<{ title: string }>
    }>()
  })
})
