import type { ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry } from '../blocks.ts'
import { defineCollection } from '../collections.ts'
import { defineComponents } from '../components.ts'
import { entries, type EntryGroup } from '../references.ts'
import { Blocks } from './blocks.tsx'

const dish = defineCollection({
  name: 'dish',
  label: 'name',
  schema: z.object({ name: z.string(), course: z.enum(['starter', 'main']) })
})

const menu = defineBlock({ name: 'menu', schema: z.object({ dishes: entries(dish) }) })

const registry = defineRegistry([menu], {
  collections: [dish],
  layouts: [defineLayout({ name: 'default' })]
})

const Menu = ({ dishes }: { dishes: unknown }) => (
  <ul>
    {(dishes as EntryGroup<typeof dish>[]).map(({ group, entries: members }) => (
      <li key={group}>{`${group}: ${members.map(({ content }) => content.name).join(',')}`}</li>
    ))}
  </ul>
)

const components = defineComponents(registry, {
  blocks: { menu: Menu as never },
  layouts: { default: ({ children }: { children: ReactNode }) => <main>{children}</main> }
})

const entry = (id: string, name: string, course: string) => ({
  id,
  schemaVersion: 1,
  content: { name, course }
})

const snapshot = {
  pageId: 'page-1',
  blocks: [
    {
      id: 'b1',
      block: 'menu',
      schemaVersion: 1,
      content: { dishes: { mode: 'query', limit: 5, groupBy: 'course' } }
    }
  ],
  entries: { dish: { a: entry('a', 'Soup', 'starter'), b: entry('b', 'Steak', 'main') } },
  references: { b1: { dishes: ['a', 'b'] } },
  groups: {
    b1: {
      dishes: [
        { group: 'starter', ids: ['a'] },
        { group: 'main', ids: ['b'] }
      ]
    }
  }
}

describe('Blocks with a grouped query', () => {
  it('hands the component the groups with their resolved entries', async () => {
    const stream = await renderToReadableStream(
      <Blocks components={components} snapshot={snapshot} />
    )
    expect(await new Response(stream).text()).toBe(
      '<ul><li>starter: Soup</li><li>main: Steak</li></ul>'
    )
  })
})
