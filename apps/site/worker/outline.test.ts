import type { ComponentMap, LayoutProps } from '@studiobimo/backstage'
import type { PageBlock } from '@studiobimo/backstage/site'
import { createSite } from '@studiobimo/backstage/site/hono'
import { createElement } from 'react'
import { afterAll, describe, expect, it } from 'vitest'

import { components } from '../src/blocks/component-map'
import { SiteFooter } from '../src/blocks/site-footer/component'
import { SiteHeader } from '../src/blocks/site-header/component'
import {
  clearKv,
  heroBlock,
  platform,
  publishSnapshots,
  richParagraph,
  snapshotOf
} from './test-support'

afterAll(() => platform.dispose())

const heading = (level: number, text: string) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }]
})

const block = (name: string, id: string, content: object) =>
  ({ id, block: name, schemaVersion: 1, content }) as PageBlock

const blankRichText = { type: 'doc', content: [{ type: 'paragraph' }] }

const pageBlocks = [
  heroBlock({ en: 'First hero' }, { en: { type: 'doc', content: [heading(2, 'Inside hero')] } }),
  { ...heroBlock({ en: 'Second hero' }), id: 'b2' },
  block('one-column-section', 'b3', { heading: {}, body: { en: blankRichText } }),
  block('one-column-text', 'b4', {
    heading: { en: 'Story' },
    body: { en: { type: 'doc', content: [heading(2, 'Chapter'), heading(3, 'Detail')] } }
  }),
  block('two-column-text', 'b5', {
    left: { heading: {}, body: {} },
    right: { heading: { en: 'Right' }, body: { en: richParagraph('Text') } }
  })
]

const header = createElement(SiteHeader, {
  navigation: [
    { link: { en: { href: '/about', label: 'About' } }, dropdown: [{}] },
    { link: {}, dropdown: [] }
  ],
  cta: {}
})

const footer = createElement(SiteFooter, {
  text: {},
  columns: [{ heading: {}, links: [{}] }],
  contact: { address: {} }
})

const PageLayout = ({ children }: LayoutProps) =>
  createElement('div', null, header, createElement('main', null, children), footer)

const outlineSite = createSite({
  components: { ...components, layouts: { default: PageLayout } } as ComponentMap,
  stylesheet: ''
})

const render = async (locale: 'en' | 'es') => {
  await clearKv()
  await publishSnapshots(snapshotOf({ locale, slug: 'about', blocks: pageBlocks }))
  const path = locale === 'en' ? '/about' : '/es/about'
  return (await outlineSite.request(path, {}, platform.env)).text()
}

const outline = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>([^<]+)<\/h\1>/g)].map(([, level, text]) => `${level}:${text}`)

const VOID_TAGS = new Set(['img', 'br', 'meta', 'link', 'input', 'hr'])

const emptyElements = (html: string) =>
  [...html.matchAll(/<([a-z0-9]+)(?:\s[^>]*)?>\s*<\/\1>/g)]
    .map(([whole, tag]) => ({ whole, tag }))
    .filter(({ tag }) => !VOID_TAGS.has(tag ?? ''))

const navTags = (html: string) => [...html.matchAll(/<nav[^>]*>/g)].map(([tag]) => tag)

describe('the page outline', () => {
  it('has one h1 and nests every heading under its section', async () => {
    expect(outline(await render('en'))).toEqual([
      '1:About',
      '2:First hero',
      '3:Inside hero',
      '2:Second hero',
      '2:Story',
      '3:Chapter',
      '3:Detail',
      '2:Right'
    ])
  })

  it('renders nothing for blank blocks, a blank footer or a blank nav item', async () => {
    const html = await render('en')
    expect(emptyElements(html)).toEqual([])
    expect(html).not.toContain('data-block="one-column-section"')
    expect(html).not.toContain('<footer')
    expect(html).not.toContain('<address')
    expect(html.match(/<li>/g)).toHaveLength(2)
  })

  it('labels every nav in the page language', async () => {
    const en = navTags(await render('en'))
    const es = navTags(await render('es')).join('')
    expect(en).toHaveLength(2)
    expect(en.every((tag) => /aria-label="[^"]+"/.test(tag))).toBe(true)
    expect(es).toMatch(/aria-label="Idioma"/)
    expect(es).toMatch(/aria-label="Principal"/)
  })
})
