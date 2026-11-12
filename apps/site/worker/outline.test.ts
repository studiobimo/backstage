import type { ComponentMap, LayoutProps, PageBlock } from '@studiobimo/backstage'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it } from 'vitest'

import { components } from '../src/blocks/component-map'
import { SiteFooter } from '../src/blocks/site-footer/component'
import { SiteHeader } from '../src/blocks/site-header/component'
import { Document } from './document'
import { heroBlock, platform, richParagraph, snapshotOf } from './test-support'

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

const render = (locale: 'en' | 'es') =>
  renderToStaticMarkup(
    createElement(Document, {
      components: { ...components, layouts: { default: PageLayout } } as ComponentMap,
      snapshot: snapshotOf({ locale, slug: 'about', blocks: pageBlocks }),
      translations: [],
      origin: 'https://example.com'
    })
  )

const outline = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>([^<]+)<\/h\1>/g)].map(([, level, text]) => `${level}:${text}`)

const VOID_TAGS = new Set(['img', 'br', 'meta', 'link', 'input', 'hr'])

const emptyElements = (html: string) =>
  [...html.matchAll(/<([a-z0-9]+)(?:\s[^>]*)?>\s*<\/\1>/g)]
    .map(([whole, tag]) => ({ whole, tag }))
    .filter(({ tag }) => !VOID_TAGS.has(tag ?? ''))

const navTags = (html: string) => [...html.matchAll(/<nav[^>]*>/g)].map(([tag]) => tag)

describe('the page outline', () => {
  it('has one h1 and nests every heading under its section', () => {
    expect(outline(render('en'))).toEqual([
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

  it('renders nothing for blank blocks, a blank footer or a blank nav item', () => {
    const html = render('en')
    expect(emptyElements(html)).toEqual([])
    expect(html).not.toContain('data-block="one-column-section"')
    expect(html).not.toContain('<footer')
    expect(html).not.toContain('<address')
    expect(html.match(/<li>/g)).toHaveLength(2)
  })

  it('labels every nav in the page language', () => {
    expect(navTags(render('en'))).toHaveLength(2)
    expect(navTags(render('en')).every((tag) => /aria-label="[^"]+"/.test(tag))).toBe(true)
    expect(navTags(render('es')).join('')).toMatch(/aria-label="Idioma"/)
    expect(navTags(render('es')).join('')).toMatch(/aria-label="Principal"/)
  })
})
