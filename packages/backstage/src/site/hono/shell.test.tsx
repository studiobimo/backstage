import { describe, expect, it } from 'vitest'

import { createSite, type CreateSiteOptions } from './create-site.ts'
import { viteAssets } from '../../vite-assets.ts'
import { renderInShell, type ShellOptions } from './shell.ts'
import {
  envWith,
  FIXTURE,
  fixtureOptions,
  memoryKv,
  pageSnapshot,
  siteSnapshot
} from './site-fixture.tsx'
import { stylesheetPathFor } from './stylesheet.ts'

const RESERVE = { path: '/reserve', script: '/reserve/app.js', mount: 'reserve-root' } as const

const executionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {}
} as unknown as ExecutionContext

const kv = () =>
  memoryKv(
    [pageSnapshot(), pageSnapshot({ locale: 'es', slug: 'sobre', title: 'Sobre' })],
    [
      siteSnapshot(),
      siteSnapshot({
        locale: 'es',
        slots: { header: { block: 'header', schemaVersion: 1, content: { text: 'Cabecera' } } }
      })
    ]
  )

const BUNDLE = viteAssets(
  {
    'src/reserve/main.tsx': {
      file: 'assets/main-AAA111.js',
      css: ['assets/main-AAA111.css'],
      imports: ['_vendor-BBB222.js']
    },
    '_vendor-BBB222.js': { file: 'assets/vendor-BBB222.js', css: ['assets/vendor-BBB222.css'] }
  },
  'src/reserve/main.tsx'
)

const CROSS_ORIGIN = 'https://cdn.example.com/app.css'

const siteWith = (
  assets: Partial<ShellOptions> = { scripts: [RESERVE.script] },
  options: Partial<CreateSiteOptions> = {}
) =>
  createSite(
    fixtureOptions({
      contentSecurityPolicy: { scriptSrc: ["'self'"] },
      ...options,
      routes: (app) => {
        app.get(`/:locale{es}${RESERVE.path}`, (c) =>
          renderInShell(c, {
            locale: 'es',
            title: 'Reservar',
            description: 'Elige tu asiento',
            body: <div id={RESERVE.mount} data-floor="main" />,
            ...assets,
            translations: { en: RESERVE.path }
          })
        )
        app.get(RESERVE.path, (c) =>
          renderInShell(c, {
            locale: 'en',
            title: 'Reserve',
            body: <div id={RESERVE.mount} data-floor="main" />,
            ...assets
          })
        )
      }
    })
  )

const get = async (
  path: string,
  assets?: Partial<ShellOptions>,
  options?: Partial<CreateSiteOptions>
) => {
  const response = await siteWith(assets, options).request(
    path,
    {},
    envWith({}, kv()),
    executionContext
  )
  return { response, html: response.status === 200 ? await response.text() : '' }
}

const headTagsOf = (html: string, names: readonly RegExp[]) =>
  names.map((name) => html.match(name)?.[0])

const SHARED_HEAD = [
  /<meta charSet="utf-8"\/>/,
  /<meta name="viewport"[^>]*\/>/,
  /<link rel="stylesheet"[^>]*\/>/,
  /<meta property="og:site_name"[^>]*\/>/
]

describe('renderInShell', () => {
  it('renders the same slots, stylesheet and shared head tags as a content page', async () => {
    const content = await get('/about')
    const shell = await get(RESERVE.path)
    expect(shell.response.status).toBe(200)
    expect(headTagsOf(shell.html, SHARED_HEAD)).toEqual(headTagsOf(content.html, SHARED_HEAD))
    expect(shell.html).toContain(
      `<link rel="stylesheet" href="${stylesheetPathFor(FIXTURE.stylesheet)}"/>`
    )
    expect(shell.html).toContain(
      '<div data-slot-header="true"><header>Studio header</header></div>'
    )
    expect(shell.html).toContain('<title>Reserve | Studio</title>')
    expect(shell.html).toContain(`<link rel="canonical" href="${FIXTURE.siteUrl}/reserve"/>`)
  })

  it('uses the slots, language and switcher of the requested locale', async () => {
    const content = await get('/es/sobre')
    const shell = await get(`/es${RESERVE.path}`)
    expect(shell.html).toContain('<html lang="es">')
    expect(shell.html).toContain('<div data-slot-header="true"><header>Cabecera</header></div>')
    expect(headTagsOf(shell.html, SHARED_HEAD)).toEqual(headTagsOf(content.html, SHARED_HEAD))
    expect(shell.html).toContain('aria-label="Idioma"')
    expect(shell.html).toContain('href="/reserve"')
    expect(shell.html).toContain(
      `<link rel="alternate" hrefLang="en" href="${FIXTURE.siteUrl}/reserve"/>`
    )
  })

  it('mounts the body and loads the bundle as a module script', async () => {
    const { html } = await get(RESERVE.path)
    expect(html).toContain(`<div id="${RESERVE.mount}" data-floor="main"></div>`)
    expect(html).toContain(`<script type="module" src="${RESERVE.script}"></script>`)
  })

  it('keeps the security headers of the site', async () => {
    const { response } = await get(RESERVE.path)
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self'")
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it.each(['https://cdn.example.com/app.js', '//cdn.example.com/app.js', 'app.js'])(
    'refuses the script %s that is not a same-origin path',
    async (script) => {
      const { response } = await get(RESERVE.path, { scripts: [script] })
      expect(response.status).toBe(500)
    }
  )
})

describe('renderInShell with a client bundle', () => {
  it('links the bundle stylesheets and preloads with the hashed script', async () => {
    const { html } = await get(RESERVE.path, BUNDLE)
    expect(html).toContain('<link rel="stylesheet" href="/assets/main-AAA111.css"/>')
    expect(html).toContain('<link rel="stylesheet" href="/assets/vendor-BBB222.css"/>')
    expect(html).toContain('<link rel="modulepreload" href="/assets/vendor-BBB222.js"/>')
    expect(html).toContain('<script type="module" src="/assets/main-AAA111.js"></script>')
  })

  it('leaves the security headers unchanged by styles and preloads', async () => {
    const plain = await get(RESERVE.path)
    const bundled = await get(RESERVE.path, BUNDLE)
    expect(bundled.response.headers.get('Content-Security-Policy')).toBe(
      plain.response.headers.get('Content-Security-Policy')
    )
    expect(bundled.response.headers.get('Content-Security-Policy')).toContain("style-src 'self'")
  })

  it.each([
    ['styles', { styles: [CROSS_ORIGIN] }],
    ['preloads', { preloads: [CROSS_ORIGIN] }]
  ])('refuses a cross-origin entry in %s', async (_name, assets) => {
    const { response } = await get(RESERVE.path, assets)
    expect(response.status).toBe(500)
  })

  it('applies the site styles and preloads of createSite to shell routes, once', async () => {
    const { html } = await get(RESERVE.path, BUNDLE, {
      styles: BUNDLE.styles,
      preloads: BUNDLE.preloads
    })
    expect(html.split('href="/assets/main-AAA111.css"')).toHaveLength(2)
    expect(html.split('href="/assets/vendor-BBB222.js"')).toHaveLength(2)
  })

  it('adds the head of createSite and of the route to a shell route', async () => {
    const { html } = await get(
      RESERVE.path,
      { head: <meta name="route-tag" content="route" /> },
      { shellHead: ({ title, path }) => <meta name="shell-tag" content={`${title}${path}`} /> }
    )
    expect(html).toContain('<meta name="shell-tag" content="Reserve/reserve"/>')
    expect(html).toContain('<meta name="route-tag" content="route"/>')
  })
})
