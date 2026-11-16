import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry } from './blocks.ts'
import { defineCollection } from './collections.ts'
import {
  entries,
  entryRefsOf,
  localizeEntryContent,
  referenceFieldsIn,
  resolveReferences,
  type PublishedEntries,
  type PublishedEntry,
  type ResolvedEntry
} from './references.ts'
import { localized } from './fields.ts'
import { SNAPSHOT, upgradeSnapshot } from './publishing.ts'

const post = defineCollection({
  name: 'post',
  label: 'title',
  schema: z.object({ title: localized(z.string()), tags: z.array(z.string()).default([]) })
})

const list = defineBlock({
  name: 'post-list',
  schema: z.object({ heading: z.string(), posts: entries(post, { max: 3 }) })
})

const registry = defineRegistry([list], { collections: [post] })
const node = registry.jsonSchema('post-list')

const published = (id: string): PublishedEntry => ({ id, schemaVersion: 1, content: {} })

const pool = (ids: string[], latest: string[]): PublishedEntries =>
  new Map([
    [
      'post',
      {
        byId: new Map([...ids, ...latest].map((id) => [id, published(id)])),
        latest: latest.map(published)
      }
    ]
  ])

const fieldsOf = (posts: unknown) => referenceFieldsIn(node, 'b1', { heading: 'h', posts })

describe('entries()', () => {
  it('is a marked reference carrying its collection and limit in the JSON Schema', () => {
    expect(node.properties).toMatchObject({
      posts: { backstage: 'reference', collection: 'post', max: 3 }
    })
  })

  it('accepts chosen ids and a latest count, within the limit', () => {
    const { schema } = list
    expect(schema.safeParse({ heading: 'h', posts: { mode: 'chosen', ids: ['a'] } }).success).toBe(
      true
    )
    expect(schema.safeParse({ heading: 'h', posts: { mode: 'latest', count: 3 } }).success).toBe(
      true
    )
    expect(schema.safeParse({ heading: 'h', posts: { mode: 'latest', count: 4 } }).success).toBe(
      false
    )
    expect(
      schema.safeParse({ heading: 'h', posts: { mode: 'chosen', ids: ['a', 'b', 'c', 'd'] } })
        .success
    ).toBe(false)
  })

  it('types the component prop as the resolved entries of the collection', () => {
    type Props = z.output<typeof list.schema>
    expectTypeOf<Props['posts']>().toEqualTypeOf<ResolvedEntry<typeof post>[]>()
  })
})

describe('defineRegistry with references', () => {
  it('throws for a reference to an unknown collection', () => {
    expect(() => defineRegistry([list])).toThrow(/unknown collection "post"/)
  })

  it('throws for a collection that refers to entries', () => {
    const nested = defineCollection({
      name: 'nested',
      label: 'title',
      schema: z.object({ title: z.string(), more: entries(post) })
    })
    expect(() => defineRegistry([], { collections: [post, nested] })).toThrow(/cannot refer/)
  })
})

describe('resolving references', () => {
  it('keeps the chosen order, drops entries that are not published and repeats', () => {
    const fields = fieldsOf({ mode: 'chosen', ids: ['b', 'gone', 'a', 'b'] })
    const resolved = resolveReferences(fields, pool(['a', 'b'], []))
    expect(resolved.references).toEqual({ b1: { posts: ['b', 'a'] } })
    expect(Object.keys(resolved.entries.post ?? {}).sort()).toEqual(['a', 'b'])
  })

  it('takes the newest entries for latest, up to the count', () => {
    const resolved = resolveReferences(
      fieldsOf({ mode: 'latest', count: 2 }),
      pool([], ['new', 'mid', 'old'])
    )
    expect(resolved.references).toEqual({ b1: { posts: ['new', 'mid'] } })
  })

  it('records the chosen ids, drafts included, and "latest" as a collection', () => {
    expect(entryRefsOf(fieldsOf({ mode: 'chosen', ids: ['a', 'a', 'z'] }))).toEqual([
      { collection: 'post', entryId: 'a' },
      { collection: 'post', entryId: 'z' }
    ])
    expect(entryRefsOf(fieldsOf({ mode: 'latest', count: 1 }))).toEqual([
      { collection: 'post', entryId: null }
    ])
  })

  it('ignores a value that is not a reference', () => {
    expect(fieldsOf({ mode: 'other' })).toEqual([])
  })
})

describe('localizing entry content', () => {
  const entryNode = registry.collectionJsonSchema('post')
  const content = { title: { en: 'Hello', es: '' }, tags: ['x'] }

  it('keeps the snapshot locale value when it has one', () => {
    expect(
      localizeEntryContent(entryNode, { title: { en: 'Hi', es: 'Hola' } }, 'es', 'en')
    ).toEqual({ title: { es: 'Hola' } })
  })

  it('falls back to the default locale when the value is blank', () => {
    expect(localizeEntryContent(entryNode, content, 'es', 'en')).toEqual({
      title: { es: 'Hello' },
      tags: ['x']
    })
  })
})

describe('snapshot format', () => {
  it('upgrades a format 1 snapshot with empty entries and references', () => {
    expect(upgradeSnapshot({ format: 1, pageId: 'p' })).toEqual({
      format: SNAPSHOT.format,
      pageId: 'p',
      entries: {},
      references: {}
    })
  })
})
