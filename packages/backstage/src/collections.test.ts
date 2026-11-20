import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry, validateBlockContent } from './blocks.ts'
import {
  collectionsOf,
  defineCollection,
  describeCollections,
  entryLabelsOf
} from './collections.ts'
import { image, localized, richText } from './fields.ts'

const post = defineCollection({
  name: 'blog',
  label: 'title',
  title: { en: 'Blog', es: 'Blog' },
  schema: z.object({
    title: localized(z.string()),
    body: localized(richText()),
    cover: image().optional(),
    featured: z.boolean().default(false)
  })
})

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

const registry = defineRegistry([note], { collections: [post] })

describe('defineCollection', () => {
  it('defaults the version to 1', () => expect(post.version).toBe(1))

  it('rejects names that are not slugs', () => {
    expect(() =>
      defineCollection({
        name: 'Blog Posts',
        label: 'title',
        schema: z.object({ title: z.string() })
      })
    ).toThrow(/Collection name/)
  })
})

describe('defineRegistry with collections', () => {
  it('looks collections up by name', () => {
    expect(registry.getCollection('blog')).toBe(post)
    expect(registry.getCollection('nope')).toBeUndefined()
    expect([...registry.collections.keys()]).toEqual(['blog'])
  })

  it('keeps blocks and collections apart, so a collection may share a block name', () => {
    const same = defineCollection({ name: 'note', label: 'text', schema: note.schema })
    expect(defineRegistry([note], { collections: [same] }).getCollection('note')).toBe(same)
  })

  it('has no collections unless it is given some', () => {
    expect(defineRegistry([note]).collections.size).toBe(0)
  })

  it('refuses a duplicate collection name', () => {
    expect(() => defineRegistry([note], { collections: [post, post] })).toThrow(
      'Collection "blog" is registered twice'
    )
  })

  it('refuses a schema the admin form cannot render, naming the collection and field', () => {
    const broken = defineCollection({
      name: 'broken',
      label: 'title',
      schema: z.object({ title: z.string(), cover: image().nullable() })
    })
    expect(() => defineRegistry([note], { collections: [broken] })).toThrow(
      'Collection "broken" field "cover"'
    )
  })

  it('refuses a schema that cannot be described', () => {
    type Node = { title: string; children: Node[] }
    const node: z.ZodType<Node> = z.object({
      title: z.string(),
      children: z.lazy(() => z.array(node))
    })
    const recursive = defineCollection({ name: 'tree', label: 'title' as never, schema: node })
    expect(() => defineRegistry([note], { collections: [recursive] })).toThrow(/cannot describe/)
  })

  it.each([
    ['a missing field', z.object({ heading: z.string() })],
    ['a number', z.object({ title: z.number() })],
    ['a localized rich text', z.object({ title: localized(richText()) })],
    ['an image', z.object({ title: image() })]
  ])('refuses a label that names %s', (_, schema) => {
    const collection = defineCollection({ name: 'odd', label: 'title', schema } as never)
    expect(() => defineRegistry([note], { collections: [collection] })).toThrow(
      'Collection "odd" label "title"'
    )
  })

  it('accepts a plain text label', () => {
    const plain = defineCollection({
      name: 'plain',
      label: 'name',
      schema: z.object({ name: z.string() })
    })
    expect(() => defineRegistry([note], { collections: [plain] })).not.toThrow()
  })
})

describe('quick toggles', () => {
  const dish = (quickToggle: string[]) =>
    defineCollection({
      name: 'dishes',
      label: 'name',
      quickToggle,
      schema: z.object({ name: z.string(), soldOut: z.boolean().default(false) })
    } as never)

  it('accepts a yes/no field and describes it', () => {
    const registry = defineRegistry([note], { collections: [dish(['soldOut'])] })
    expect(describeCollections(registry)[0]?.quickToggle).toEqual(['soldOut'])
  })

  it.each([
    ['a text field', 'name'],
    ['a missing field', 'gone']
  ])('refuses %s', (_, field) => {
    expect(() => defineRegistry([note], { collections: [dish([field])] })).toThrow(
      `quick toggle "${field}"`
    )
  })
})

describe('collection JSON Schema', () => {
  it('describes each collection like a block, with its fields marked', () => {
    const schema = registry.collectionJsonSchema('blog') as {
      properties: Record<string, { backstage?: string }>
    }
    expect(Object.keys(schema.properties)).toEqual(['title', 'body', 'cover', 'featured'])
    expect(schema.properties.title?.backstage).toBe('localized')
    expect(schema.properties.cover?.backstage).toBe('image')
  })

  it('throws for an unknown collection', () => {
    expect(() => registry.collectionJsonSchema('nope')).toThrow('Unknown collection "nope"')
  })

  it('lists the collections for the admin', () => {
    expect(describeCollections(registry)).toEqual([
      {
        name: 'blog',
        version: 1,
        label: 'title',
        schema: registry.collectionJsonSchema('blog'),
        title: { en: 'Blog', es: 'Blog' },
        description: undefined
      }
    ])
  })

  it('lists nothing for a registry made before collections existed', () => {
    expect(describeCollections({})).toEqual([])
    expect(collectionsOf({}).size).toBe(0)
  })
})

describe('collection content versions', () => {
  const versioned = defineCollection({
    name: 'story',
    label: 'headline',
    version: 2,
    schema: z.object({ headline: z.string(), tags: z.array(z.string()) }),
    migrate: (content, fromVersion) =>
      fromVersion === 1 ? { ...(content as { headline: string }), tags: [] } : content
  })

  it('upgrades stored content to the current version before validating', () => {
    expect(validateBlockContent(versioned, 1, { headline: 'Hi' })).toEqual({
      ok: true,
      schemaVersion: 2,
      content: { headline: 'Hi', tags: [] }
    })
  })

  it('reports zod issues for invalid content and applies schema defaults', () => {
    expect(validateBlockContent(post, 1, { title: { en: 1 } })).toMatchObject({ ok: false })
    expect(
      validateBlockContent(post, 1, {
        title: { en: 'Hi' },
        body: { en: { type: 'doc', content: [] } }
      })
    ).toMatchObject({
      ok: true,
      content: { featured: false }
    })
  })

  it('refuses content from a newer version', () => {
    expect(validateBlockContent(post, 2, {})).toMatchObject({
      ok: false,
      failure: 'newer_version'
    })
  })
})

describe('entryLabelsOf', () => {
  it('reads one label per locale from a localized field, skipping blanks', () => {
    expect(entryLabelsOf(post, { title: { en: ' Hello ', es: '  ' } }, 'en')).toEqual({
      en: 'Hello'
    })
  })

  it('files a plain text label under the default locale', () => {
    const plain = defineCollection({
      name: 'plain',
      label: 'name',
      schema: z.object({ name: z.string() })
    })
    expect(entryLabelsOf(plain, { name: 'Ada' }, 'es')).toEqual({ es: 'Ada' })
  })

  it('has no label when the field is empty or missing', () => {
    expect(entryLabelsOf(post, {}, 'en')).toEqual({})
    expect(entryLabelsOf(post, null, 'en')).toEqual({})
  })
})
