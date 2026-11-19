import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry, SLOT } from '../../blocks.ts'
import { defineComponents } from '../../components.ts'
import { createSite } from './create-site.ts'
import {
  entrySnapshot,
  envWith,
  fixtureComponents,
  fixtureOptions,
  memoryKv,
  pageSnapshot,
  siteSnapshot
} from './site-fixture.tsx'

const SCRIPT = {
  site: '/site.js',
  cart: '/cart.js',
  carousel: '/carousel.js',
  header: '/header.js'
} as const

const textSchema = z.object({ text: z.string() })
const cart = defineBlock({ name: 'cart', schema: textSchema, clientScript: SCRIPT.cart })
const carousel = defineBlock({
  name: 'carousel',
  schema: textSchema,
  clientScript: SCRIPT.carousel
})
const header = defineBlock({ name: 'header', schema: textSchema, clientScript: SCRIPT.header })
const plain = defineBlock({ name: 'plain', schema: textSchema })

const Text = ({ text }: { text: string }) => <p>{text}</p>

const scriptedComponents = () =>
  defineComponents(
    defineRegistry([cart, carousel, header, plain], {
      slots: { [SLOT.header]: [header.name] },
      layouts: [defineLayout({ name: 'default' })]
    }),
    {
      blocks: { cart: Text, carousel: Text, header: Text, plain: Text },
      layouts: { default: ({ children }: { children: ReactNode }) => <main>{children}</main> }
    }
  )

const block = (id: string, name: string) => ({
  id,
  block: name,
  schemaVersion: 1,
  content: { text: id }
})

const executionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {}
} as unknown as ExecutionContext

const KV = memoryKv(
  [
    pageSnapshot(),
    pageSnapshot({
      slug: 'menu',
      blocks: [block('a', cart.name), block('b', cart.name), block('c', carousel.name)]
    }),
    pageSnapshot({ pageId: 'p2', slug: 'plain', blocks: [block('d', plain.name)] })
  ],
  [
    siteSnapshot({
      slots: { header: { block: 'header', schemaVersion: 1, content: { text: 'h' } } }
    })
  ]
)

const get = async (path: string, options = fixtureOptions(), kv = KV) => {
  const response = await createSite(options).request(path, {}, envWith({}, kv), executionContext)
  return { response, html: await response.text() }
}

const scriptsIn = (html: string) =>
  [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map(([, src]) => src)

const scriptSrcOf = (response: Response) =>
  (response.headers.get('Content-Security-Policy') ?? '')
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src'))

const scripted = (overrides = {}) =>
  fixtureOptions({
    components: scriptedComponents(),
    ...overrides
  })

describe('site scripts option', () => {
  it('adds a module script to pages, entry pages and the block preview', async () => {
    const options = fixtureOptions({
      scripts: [SCRIPT.site],
      preview: { samples: { note: { text: 'n' } }, media: {} }
    })
    const entries = memoryKv([pageSnapshot()], [siteSnapshot()], {}, [entrySnapshot()])
    const page = await get('/about', options, entries)
    const entry = await get('/blog/hello', options, entries)
    const preview = await get('/__preview/blocks/note', options, entries)
    for (const { html } of [page, entry, preview]) expect(scriptsIn(html)).toEqual([SCRIPT.site])
  })

  it('adds script-src self and changes nothing else in the policy', async () => {
    const plainPolicy = (await get('/about')).response.headers.get('Content-Security-Policy')
    const { response } = await get('/about', fixtureOptions({ scripts: [SCRIPT.site] }))
    const policy = response.headers.get('Content-Security-Policy') ?? ''
    expect(scriptSrcOf(response)).toBe("script-src 'self'")
    expect(policy.replace("; script-src 'self'", '')).toBe(plainPolicy)
  })

  it('does not repeat self when the site already allows it', async () => {
    const { response } = await get(
      '/about',
      fixtureOptions({ scripts: [SCRIPT.site], contentSecurityPolicy: { scriptSrc: ["'self'"] } })
    )
    expect(scriptSrcOf(response)).toBe("script-src 'self'")
  })

  it.each(['https://cdn.example.com/a.js', '//cdn.example.com/a.js', 'a.js'])(
    'refuses %s because it is not a same-origin path',
    (script) => {
      expect(() => createSite(fixtureOptions({ scripts: [script] }))).toThrow(/same-origin path/)
    }
  )
})

describe('block clientScript', () => {
  it('loads the script once on a page that uses the block, whatever the instances', async () => {
    const { html } = await get('/menu', scripted())
    expect(scriptsIn(html)).toEqual([SCRIPT.cart, SCRIPT.carousel, SCRIPT.header])
  })

  it('leaves the script out of a page without the block', async () => {
    const { html } = await get('/plain', scripted())
    expect(scriptsIn(html)).toEqual([SCRIPT.header])
  })

  it('does not repeat a script the site option already lists', async () => {
    const { html } = await get('/menu', scripted({ scripts: [SCRIPT.cart] }))
    expect(scriptsIn(html)).toEqual([SCRIPT.cart, SCRIPT.carousel, SCRIPT.header])
  })

  it('allows script-src self once any block declares a script', async () => {
    expect(scriptSrcOf((await get('/menu', scripted())).response)).toBe("script-src 'self'")
    expect(scriptSrcOf((await get('/about')).response)).toBeUndefined()
  })

  it('loads the script of the previewed block', async () => {
    const options = scripted({ preview: { samples: { cart: { text: 'c' } }, media: {} } })
    const { html } = await get('/__preview/blocks/cart', options)
    expect(scriptsIn(html)).toEqual([SCRIPT.cart])
  })

  it('refuses a clientScript that is not a same-origin path', () => {
    expect(() =>
      defineBlock({ name: 'bad', schema: textSchema, clientScript: 'https://x.example/a.js' })
    ).toThrow(/same-origin path/)
  })

  it('keeps fixture sites without scripts free of script tags', async () => {
    const { html } = await get('/about', fixtureOptions({ components: fixtureComponents() }))
    expect(scriptsIn(html)).toEqual([])
  })
})
