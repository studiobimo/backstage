import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry, image, link, localized, richText } from './index.ts'

const Hero = () => null
const hero = defineBlock({
  name: 'hero',
  schema: z.object({
    title: localized(z.string()),
    body: localized(richText()),
    cta: link(),
    picture: image(),
    theme: z.enum(['light', 'dark'])
  }),
  component: Hero
})

type Props = { properties: Record<string, { backstage?: string }> }

describe('defineBlock', () => {
  it('defaults the version to 1', () => expect(hero.version).toBe(1))

  it('rejects names that are not slugs', () => {
    expect(() =>
      defineBlock({ name: 'Hero Banner', schema: z.object({}), component: Hero })
    ).toThrow()
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
})
