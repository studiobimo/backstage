import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  defineBlock,
  defineLayout,
  defineRegistry,
  describeBlocks,
  describeSlots,
  layoutNames,
  upgradeBlockContent,
  validateBlockContent,
  image,
  link,
  localized,
  richText
} from './index.ts'

const hero = defineBlock({
  name: 'hero',
  schema: z.object({
    title: localized(z.string()),
    body: localized(richText()),
    cta: link(),
    picture: image(),
    theme: z.enum(['light', 'dark'])
  })
})

type Props = { properties: Record<string, { backstage?: string }> }

describe('defineBlock', () => {
  it('defaults the version to 1', () => expect(hero.version).toBe(1))

  it('rejects names that are not slugs', () => {
    expect(() => defineBlock({ name: 'Hero Banner', schema: z.object({}) })).toThrow()
  })
})

describe('defineRegistry', () => {
  const registry = defineRegistry([hero])

  it('looks blocks up by name', () => {
    expect(registry.get('hero')).toBe(hero)
    expect(registry.get('nope')).toBeUndefined()
  })

  it('refuses a duplicate name', () => {
    expect(() => defineRegistry([hero, hero])).toThrow(/twice/)
  })

  it('emits the field kinds as markers in the JSON Schema', () => {
    const { properties } = registry.jsonSchema('hero') as unknown as Props
    expect(properties.title?.backstage).toBe('localized')
    expect(properties.cta?.backstage).toBe('link')
    expect(properties.picture?.backstage).toBe('image')
    expect(properties.theme?.backstage).toBeUndefined()
  })
})

describe('describeBlocks', () => {
  const quote = defineBlock({
    name: 'quote',
    version: 3,
    schema: z.object({ text: z.string() })
  })

  it('lists every block in registration order with its version and JSON Schema', () => {
    const registry = defineRegistry([quote, hero])
    expect(describeBlocks(registry).map(({ name, version }) => ({ name, version }))).toEqual([
      { name: 'quote', version: 3 },
      { name: 'hero', version: 1 }
    ])
    expect(describeBlocks(registry)[1]?.schema).toEqual(registry.jsonSchema('hero'))
  })

  it('lists nothing for an empty registry', () => {
    expect(describeBlocks(defineRegistry([]))).toEqual([])
  })
})

describe('slots', () => {
  const header = defineBlock({
    name: 'site-header',
    schema: z.object({ text: z.string() })
  })
  const registry = defineRegistry([hero, header], { slots: { header: ['site-header'] } })

  it('describes each slot with the blocks it offers', () => {
    const described = describeSlots(registry).map(({ name, blocks }) => [
      name,
      blocks.map((block) => block.name)
    ])
    expect(described).toEqual([['header', ['site-header']]])
  })

  it('keeps slot blocks out of the page block list', () => {
    expect(registry.isSlotBlock('site-header')).toBe(true)
    expect(describeBlocks(registry).map(({ name }) => name)).toEqual(['hero'])
  })

  it('refuses a slot that names an unknown or no block', () => {
    expect(() => defineRegistry([hero], { slots: { header: ['nope'] } })).toThrow(/unknown block/)
    expect(() => defineRegistry([hero], { slots: { header: [] } })).toThrow(/at least one/)
    expect(() => defineRegistry([hero], { slots: { 'Bad Slot': ['hero'] } })).toThrow(/Slot name/)
  })
})

describe('layouts', () => {
  const layout = (name: string) => defineLayout({ name })

  it('always offers the default layout first', () => {
    expect(layoutNames(defineRegistry([]))).toEqual(['default'])
    const registry = defineRegistry([], { layouts: [layout('bare'), layout('default')] })
    expect(layoutNames(registry)).toEqual(['default', 'bare'])
    expect(registry.hasLayout('bare')).toBe(true)
    expect(registry.hasLayout('nope')).toBe(false)
  })

  it('refuses a duplicate or malformed name', () => {
    expect(() => defineRegistry([], { layouts: [layout('a'), layout('a')] })).toThrow(/twice/)
    expect(() => layout('Not A Slug')).toThrow()
  })
})

describe('block content', () => {
  const note = defineBlock({
    name: 'note',
    version: 2,
    schema: z.object({ text: z.string().min(1) }),
    migrate: (content, from) =>
      from === 1 ? { text: (content as { body: string }).body } : content
  })

  it('migrates old content to the current version', () => {
    expect(upgradeBlockContent(note, 1, { body: 'Hi' })).toEqual({
      ok: true,
      schemaVersion: 2,
      content: { text: 'Hi' }
    })
  })

  it('refuses a version newer than the block', () => {
    expect(upgradeBlockContent(note, 3, {}).ok).toBe(false)
  })

  it('validates migrated content against the schema', () => {
    expect(validateBlockContent(note, 1, { body: 'Hi' }).ok).toBe(true)
    expect(validateBlockContent(note, 2, { text: '' }).ok).toBe(false)
  })
})

describe('field helpers', () => {
  it('stores a localized value per locale and allows a missing one', () => {
    const field = localized(z.string())
    expect(field.safeParse({ en: 'Hi', es: 'Hola' }).success).toBe(true)
    expect(field.safeParse({ en: 'Hi' }).success).toBe(true)
    expect(field.safeParse({ en: 3 }).success).toBe(false)
  })

  it('validates links and images', () => {
    expect(link().safeParse({ href: '' }).success).toBe(false)
    expect(link().parse({ href: '/about' })).toEqual({ href: '/about', label: '' })
    expect(image().safeParse({ id: 'a1' }).success).toBe(true)
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com'])(
    'rejects the unsafe href %s',
    (href) => {
      expect(link().safeParse({ href }).success).toBe(false)
    }
  )

  it.each(['https://example.com', 'mailto:a@b.co', 'tel:+34123', '/about', '#top'])(
    'accepts the safe href %s',
    (href) => {
      expect(link().safeParse({ href }).success).toBe(true)
    }
  )

  it('requires a label only when asked to', () => {
    expect(link({ requireLabel: true }).safeParse({ href: '/a', label: ' ' }).success).toBe(false)
    expect(link({ requireLabel: true }).safeParse({ href: '/a', label: 'A' }).success).toBe(true)
  })
})
