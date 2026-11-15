import type { PageBlock } from '@studiobimo/backstage/site'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { registry } from '../src/blocks/registry'
import { clearKv, get, heroBlock, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const publishWith = (block: PageBlock) =>
  publishSnapshots(
    snapshotOf({ locale: 'en', slug: 'about', blocks: [block] }),
    snapshotOf({ locale: 'es', slug: 'acerca', blocks: [block] })
  )

const html = async (path: string) => (await get(path)).text()

const OLD_CTA = { href: '/contact', label: 'Contact' }

describe('call to action links', () => {
  it('show the Spanish button on the Spanish page and the English one on the English page', async () => {
    await publishWith(heroBlock({ en: 'Hello', es: 'Hola' }))
    expect(await html('/about')).toContain('href="/contact">Contact</a>')
    expect(await html('/es/acerca')).toContain('href="/contacto">Contacto</a>')
  })

  it('fall back to the English button when a locale has none', async () => {
    const block = heroBlock({ en: 'Hello' })
    const content = block.content as { cta: Record<string, unknown> }
    content.cta = { en: content.cta.en }
    await publishWith(block)
    expect(await html('/es/acerca')).toContain('href="/contact">Contact</a>')
  })

  it('open content saved with a single link, under the default locale', async () => {
    const old = heroBlock({ en: 'Hello' })
    await publishWith({
      ...old,
      schemaVersion: 1,
      content: { ...(old.content as object), cta: OLD_CTA } as PageBlock['content']
    })
    expect(await html('/about')).toContain('href="/contact">Contact</a>')
    expect(await html('/es/acerca')).toContain('href="/contact">Contact</a>')
  })
})

describe('the block migrations', () => {
  const upgrade = (name: string, content: unknown) => registry.get(name)!.migrate!(content, 1)

  it.each(['overlay-hero', 'split-hero', 'one-column-section'])(
    'wrap the %s link under the default locale and leave an absent one alone',
    (name) => {
      expect(upgrade(name, { cta: OLD_CTA })).toEqual({ cta: { en: OLD_CTA } })
      expect(upgrade(name, { title: {} })).toEqual({ title: {} })
    }
  )

  it('wrap the link in each column of a two-column section', () => {
    expect(upgrade('two-column-section', { left: { cta: OLD_CTA }, right: {} })).toEqual({
      left: { cta: { en: OLD_CTA } },
      right: {}
    })
  })

  it('do not wrap a link that is already localized', () => {
    const content = { cta: { en: OLD_CTA } }
    expect(upgrade('split-hero', content)).toEqual(content)
  })

  it('stop at the current version', () => {
    const block = registry.get('split-hero')!
    expect(block.migrate!({ cta: OLD_CTA }, block.version)).toEqual({ cta: OLD_CTA })
  })
})

describe('image alt text', () => {
  it('comes from the media library for the page locale, never from a block override', async () => {
    const block = heroBlock({ en: 'Hello' })
    const content = block.content as { picture: { id: string; alt: string } }
    content.picture = { id: 'm1', alt: 'English override' }
    await publishWith(block)
    expect(await html('/about')).toContain('alt="A cat"')
    expect(await html('/about')).not.toContain('English override')
  })
})
