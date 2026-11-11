import type { ReactNode } from 'react'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry, SLOT } from '../blocks.ts'
import { defineComponents } from '../components.ts'
import type { Snapshot } from '../publishing.ts'

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })
const banner = defineBlock({ name: 'banner', schema: z.object({ text: z.string() }) })
const header = defineBlock({ name: 'header', schema: z.object({ text: z.string() }) })

const Note = ({ text }: { text: string }) => <p>{text}</p>
const Header = ({ text }: { text: string }) => <header>{text}</header>
const Layout = ({ children }: { children: ReactNode }) => <main>{children}</main>

const registry = defineRegistry([note, banner, header], {
  slots: { [SLOT.header]: [header.name] },
  layouts: [defineLayout({ name: 'default' })]
})

export const components = defineComponents(registry, {
  blocks: {
    note: Note,
    banner: undefined as never,
    header: Header
  },
  layouts: { default: Layout }
})

const blockOf = (id: string, block: string, content: unknown): Snapshot['blocks'][number] => ({
  id,
  block,
  schemaVersion: 1,
  content: content as Snapshot['blocks'][number]['content']
})

export const snapshot = {
  blocks: [
    blockOf('a', 'note', { text: 'first' }),
    blockOf('b', 'header', { text: 'a slot block' }),
    blockOf('c', 'unknown', { text: 'unregistered' }),
    blockOf('d', 'note', { text: 42 }),
    blockOf('e', 'banner', { text: 'no component' }),
    blockOf('f', 'note', { text: 'last' })
  ]
}

export const RENDERED_HTML = '<p>first</p><p>last</p>'
