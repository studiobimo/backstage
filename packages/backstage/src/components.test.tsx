import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry } from './blocks.ts'
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
        // @ts-expect-error note's props are { text: string }
        blocks: { note: Quote, quote: Quote },
        layouts: { default: Layout }
      })
    }
    expect(attempts).toBeTypeOf('function')
  })
})
