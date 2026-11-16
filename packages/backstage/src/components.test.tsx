import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry } from './blocks.ts'
import { defineCollection } from './collections.ts'
import { defineComponents, type LayoutProps } from './components.ts'

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
const quote = defineBlock({ name: 'quote', schema: z.object({ by: z.string() }) })
const registry = defineRegistry([note, quote], { layouts: [defineLayout({ name: 'default' })] })

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

  it('fails to compile when a block, a layout or a prop type is wrong', () => {
    const attempts = () => {
      // @ts-expect-error quote has no component
      defineComponents(registry, { blocks: { note: Note }, layouts: { default: Layout } })
      // @ts-expect-error the default layout has no component
      defineComponents(registry, { blocks: { note: Note, quote: Quote }, layouts: {} })
      defineComponents(registry, {
        // @ts-expect-error typo is not a registered block
        blocks: { note: Note, quote: Quote, typo: Note },
        layouts: { default: Layout }
      })
      defineComponents(registry, {
        // @ts-expect-error note's props are { text: string }
        blocks: { note: Quote, quote: Quote },
        layouts: { default: Layout }
      })
    }
    expect(attempts).toBeTypeOf('function')
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
  const withCollections = defineRegistry([note], {
    layouts: [defineLayout({ name: 'default' })],
    collections: [article, faq]
  })
  const Article = ({ title }: { title: string }) => <h1>{title}</h1>

  it('takes a template for each routed collection and none for the others', () => {
    const map = defineComponents(withCollections, {
      blocks: { note: Note },
      layouts: { default: Layout },
      collections: { article: Article }
    })
    expect(map.collections?.article).toBe(Article)
  })

  it('fails to compile when a routed collection has no template or the props differ', () => {
    const attempts = () => {
      // @ts-expect-error article is routed and needs a template
      defineComponents(withCollections, { blocks: { note: Note }, layouts: { default: Layout } })
      defineComponents(withCollections, {
        blocks: { note: Note },
        layouts: { default: Layout },
        // @ts-expect-error faq has no route, so it takes no template
        collections: { article: Article, faq: Article }
      })
      defineComponents(withCollections, {
        blocks: { note: Note },
        layouts: { default: Layout },
        // @ts-expect-error article's props are { title: string }
        collections: { article: Quote }
      })
    }
    expect(attempts).toBeTypeOf('function')
  })
})
