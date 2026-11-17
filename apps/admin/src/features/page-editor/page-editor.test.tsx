import { blockThumbnailUrl, type PageBlock, type PageSeo } from '@studiobimo/backstage/internal'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'
import { blocker } from '@/test/blocker'
import { aboutPage } from '@/test/fixtures'
import { testQueryClient } from '@/test/query-client'
import { PageEditor } from './page-editor'

vi.mock('@tanstack/react-router', async () => ({
  ...(await import('@/test/blocker')).blockerRouterMock,
  Link: ({ children }: { children: ReactNode }) => <a href="/pages">{children}</a>
}))

const SITE_ORIGIN = 'https://site.test'
const about = aboutPage
const hero = {
  name: 'hero',
  version: 1,
  schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] }
}
const saved: PageBlock[] = [
  { id: 'a', block: 'hero', schemaVersion: 1, content: { title: 'One' } },
  { id: 'b', block: 'hero', schemaVersion: 1, content: { title: 'Two' } }
]

const STALE_BODY = {
  code: 'stale_version',
  error: 'A newer version of this page was saved',
  current: { version: 4, updatedAt: Date.UTC(2026, 10, 8, 12, 30), updatedBy: 'Ana Ruiz' }
}

const emptySeo: PageSeo = {
  en: { title: '', description: '', socialImageId: null },
  es: { title: '', description: '', socialImageId: null }
}

type MockOptions = { stale?: boolean; seo?: PageSeo; descriptions?: unknown[] }
type SeoPut = { expectedVersion: number; [locale: string]: unknown }
const layoutRadio = (group: HTMLElement, name: RegExp) =>
  within(group).getAllByRole('radio', { name })[0]!

type LayoutPut = { layout: string; expectedVersion: number }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const bodyOf = <T,>(init: RequestInit) => JSON.parse(init.body as string) as T

const seoResponse = (init: RequestInit | undefined, options: MockOptions, seoPuts: SeoPut[]) => {
  if (init?.method !== 'PUT') return json({ seo: options.seo ?? emptySeo, version: 3 })
  const { expectedVersion, ...seo } = bodyOf<SeoPut>(init)
  seoPuts.push({ ...seo, expectedVersion })
  return json({ seo, version: expectedVersion + 1 })
}

const layoutPutResponse = (init: RequestInit, layoutPuts: LayoutPut[]) => {
  const body = bodyOf<LayoutPut>(init)
  layoutPuts.push(body)
  return json({ page: { ...about, layout: body.layout, version: body.expectedVersion + 1 } })
}

const blocksPutResponse = (
  init: RequestInit,
  puts: { blocks: PageBlock[]; expectedVersion: number }[]
) => {
  const body = bodyOf<{ blocks: PageBlock[]; expectedVersion: number }>(init)
  puts.push(body)
  return json({ ...body, version: body.expectedVersion + 1, layout: 'default' })
}

const readResponse = (url: string, initial: PageBlock[], options: MockOptions) => {
  if (url.endsWith('/site-origin')) return json({ origin: SITE_ORIGIN })
  if (url.endsWith('/layouts')) return json({ layouts: ['default', 'minimal', 'bare'] })
  if (url.endsWith('/blocks') && url.includes('/pages/')) {
    return json({ blocks: initial, version: 3, layout: 'default' })
  }
  if (url.endsWith('/blocks')) return json({ blocks: options.descriptions ?? [hero] })
  return json({ pages: [about] })
}

const mockApi = (initial: PageBlock[], options: MockOptions = {}) => {
  const puts: { blocks: PageBlock[]; expectedVersion: number }[] = []
  const layoutPuts: LayoutPut[] = []
  const seoPuts: SeoPut[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const isPut = init?.method === 'PUT'
      if (isPut && options.stale) return json(STALE_BODY, 409)
      if (url.endsWith('/seo')) return seoResponse(init, options, seoPuts)
      if (url.endsWith('/settings')) {
        return json({ settings: { siteName: { en: 'Studio' } }, version: 1 })
      }
      if (isPut && url.endsWith('/layout')) return layoutPutResponse(init, layoutPuts)
      if (isPut) return blocksPutResponse(init, puts)
      return readResponse(url, initial, options)
    })
  )
  return Object.assign(puts, { layouts: layoutPuts, seo: seoPuts })
}

const renderEditor = (client = testQueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <Suspense>
        <PageEditor pageId="p1" />
      </Suspense>
    </QueryClientProvider>
  )

const removeFirstAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click((await screen.findAllByRole('button', { name: 'Remove hero' }))[0]!)
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

const rows = async () => within(await screen.findByRole('list')).getAllByRole('listitem')

afterEach(() => {
  vi.unstubAllGlobals()
  blocker.state = { status: 'idle' }
})

const SUITE = { timeout: 15_000 }

describe('PageEditor blocks and layout', SUITE, () => {
  it('groups the page into Blocks, Search and social and Layout frames', async () => {
    mockApi(saved)
    renderEditor()
    await rows()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)
    expect(headings).toEqual(expect.arrayContaining(['Blocks', 'Search and social']))
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeInTheDocument()
  })

  it('shows an empty state and adds a block from the picker', async () => {
    mockApi([])
    const user = userEvent.setup()
    renderEditor()
    expect(await screen.findByText('No blocks yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add block' }))
    await user.click(await screen.findByRole('option', { name: /hero/ }))
    expect(await rows()).toHaveLength(1)
  })

  it('shows each block thumbnail from the site origin', async () => {
    mockApi([])
    const user = userEvent.setup()
    renderEditor()
    await screen.findByText('No blocks yet')
    await user.click(screen.getByRole('button', { name: 'Add block' }))
    const option = await screen.findByRole('option', { name: /hero/ })
    await waitFor(() =>
      expect(option.querySelector('img')).toHaveAttribute(
        'src',
        blockThumbnailUrl(SITE_ORIGIN, 'hero')
      )
    )
  })

  it('adds a block from the picker with the keyboard alone and focuses its row', async () => {
    mockApi([], {
      descriptions: [
        hero,
        { ...hero, name: 'gallery', description: { en: 'Pictures in a grid', es: 'Fotos' } }
      ]
    })
    const user = userEvent.setup()
    renderEditor()
    await screen.findByText('No blocks yet')
    screen.getByRole('button', { name: 'Add block' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Pictures in a grid')).toBeInTheDocument()
    await user.keyboard('grid')
    expect(screen.queryByRole('option', { name: /hero/ })).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    const [row] = await rows()
    await waitFor(() => expect(row).toHaveFocus())
    expect(row).toHaveTextContent('gallery')
  })

  it('returns focus to the add button when the picker is dismissed', async () => {
    mockApi([])
    const user = userEvent.setup()
    renderEditor()
    await screen.findByText('No blocks yet')
    const add = screen.getByRole('button', { name: 'Add block' })
    await user.click(add)
    await screen.findByRole('option', { name: /hero/ })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(add).toHaveFocus())
  })
})

describe('PageEditor block names', SUITE, () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('names blocks in the admin language, not the page content language', async () => {
    mockApi([], {
      descriptions: [
        { ...hero, name: 'split-card', title: { en: 'Split card', es: 'Tarjeta con imagen' } },
        { ...hero, name: 'quote', title: { en: 'Quote' } }
      ]
    })
    const user = userEvent.setup()
    renderEditor()
    await screen.findByText('No blocks yet')
    const add = screen.getByRole('button', { name: 'Add block' })
    await i18n.changeLanguage('es')
    await user.click(add)
    expect(await screen.findByRole('option', { name: /Tarjeta con imagen/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Split card/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Quote/ })).toBeInTheDocument()
  })
})

describe('PageEditor arranging blocks and layout', SUITE, () => {
  it('duplicates and removes blocks, then saves the arrangement', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    expect(await rows()).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: 'Duplicate hero' })[0]!)
    expect(await rows()).toHaveLength(3)
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[2]!)
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[1]!)
    expect(await rows()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]!.blocks.map((block) => block.content)).toEqual([{ title: 'One' }])
    expect(puts[0]!.expectedVersion).toBe(3)
  })

  it('opens a block form, joins edits to the unsaved changes and saves them', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    await user.click((await screen.findAllByRole('button', { name: 'Edit hero' }))[0]!)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    const title = await screen.findByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Changed')
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]!.blocks.map((block) => block.content)).toEqual([
      { title: 'Changed' },
      { title: 'Two' }
    ])
  })

  it('gives each row a drag handle for pointer, touch and keyboard sorting', async () => {
    mockApi(saved)
    renderEditor()
    expect(await screen.findAllByRole('button', { name: 'Reorder hero' })).toHaveLength(2)
  })

  it('picks a layout for the page and saves it without touching the blocks', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    const group = await screen.findByRole('radiogroup', { name: 'Layout' })
    expect(layoutRadio(group, /Default/)).toHaveAttribute('aria-checked', 'true')
    await user.click(layoutRadio(group, /Minimal/))
    expect(layoutRadio(group, /Minimal/)).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts.layouts).toEqual([{ layout: 'minimal', expectedVersion: 3 }]))
    expect(puts).toHaveLength(0)
  })
})

describe('PageEditor saving and leaving', SUITE, () => {
  it('saves the blocks first and the layout on top of the version they produced', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    const group = await screen.findByRole('radiogroup', { name: 'Layout' })
    await user.click(layoutRadio(group, /Bare/))
    await user.click(screen.getAllByRole('button', { name: 'Remove hero' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts.layouts).toHaveLength(1))
    expect(puts[0]!.expectedVersion).toBe(3)
    expect(puts.layouts[0]).toEqual({ layout: 'bare', expectedVersion: 4 })
  })

  it('blocks leaving only while there are unsaved changes, and asks first', async () => {
    mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    await user.click((await screen.findAllByRole('button', { name: 'Remove hero' }))[0]!)
    expect(blocker.options?.shouldBlockFn()).toBe(true)

    const proceed = vi.fn()
    const reset = vi.fn()
    blocker.state = { status: 'blocked', proceed, reset }
    await user.click(screen.getByRole('button', { name: 'Remove hero' }))
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Leave and discard' }))
    expect(proceed).toHaveBeenCalled()
  })

  it('does not block leaving a clean page', async () => {
    mockApi(saved)
    renderEditor()
    await rows()
    expect(blocker.options?.shouldBlockFn()).toBe(false)
  })
})

describe('PageEditor refused saves', SUITE, () => {
  it('refuses to save over a newer version, names who saved it and offers a reload', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('A newer version was saved')
    expect(alert).toHaveTextContent('Ana Ruiz saved this page on')
    expect(within(alert).getByRole('button', { name: 'Reload latest version' })).toBeEnabled()
  })

  it('keeps the draft when a save is refused and lists what a reload would discard', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    await screen.findByRole('alert')
    expect(await rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Reload latest version' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('hero at position 1 removed')
    await user.click(within(dialog).getByRole('button', { name: 'Keep my changes' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await rows()).toHaveLength(1)
  })

  it('copies the draft to the clipboard from the stale alert', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(await screen.findByRole('button', { name: 'Copy my changes' }))
    expect(writeText).toHaveBeenCalledOnce()
    expect(JSON.parse(writeText.mock.calls[0]![0]).blocks).toHaveLength(1)
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('drops the draft only after the reload is confirmed', async () => {
    mockApi(saved, { stale: true })
    const user = userEvent.setup()
    renderEditor()
    await removeFirstAndSave(user)
    await user.click(await screen.findByRole('button', { name: 'Reload latest version' }))
    await user.click(await screen.findByRole('button', { name: 'Reload and discard' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await rows()).toHaveLength(2)
  })
})

describe('PageEditor SEO', SUITE, () => {
  it('edits the SEO title and description one language at a time and saves them', async () => {
    const puts = mockApi(saved)
    const user = userEvent.setup()
    renderEditor()
    const title = await screen.findByRole('textbox', { name: 'SEO title' })
    expect(title).toHaveAttribute('placeholder', 'About')
    await user.type(title, 'About the studio')
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Who we are')
    await user.click(screen.getByRole('tab', { name: /Spanish/ }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'SEO title' })).toHaveValue(''))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts.seo).toHaveLength(1))
    expect(puts.seo[0]!.en).toMatchObject({ title: 'About the studio', description: 'Who we are' })
    expect(puts.seo[0]!.expectedVersion).toBe(3)
    expect(puts).toHaveLength(0)
  })
})

describe('PageEditor on a site with one language', SUITE, () => {
  it('has no language tabs', async () => {
    mockApi(saved)
    renderEditor(testQueryClient({ locales: ['en'], defaultLocale: 'en' }))
    await screen.findByRole('textbox', { name: 'SEO title' })
    expect(screen.queryByRole('tab', { name: /Spanish/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /English/ })).toBeNull()
  })
})

describe('PageEditor languages', SUITE, () => {
  const englishOnly: PageSeo = {
    en: { title: 'About us', description: '', socialImageId: null },
    es: { title: '', description: '', socialImageId: null }
  }

  it('flags the language that is missing translations and edits it on request', async () => {
    mockApi(saved, { seo: englishOnly })
    const user = userEvent.setup()
    renderEditor()
    const spanish = await screen.findByRole('tab', { name: /Spanish/ })
    expect(spanish).toHaveTextContent('1 missing')
    expect(screen.getByRole('tab', { name: /English/ })).not.toHaveTextContent('missing')
    expect(screen.getByRole('textbox', { name: 'SEO title' })).toHaveValue('About us')
    await user.click(spanish)
    expect(spanish).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'SEO title' })).toHaveValue('')
    expect(
      screen.getByRole('heading', { name: 'Search and social' }).parentElement
    ).toHaveTextContent('Not translated')
  })

  it('stays quiet while no language has anything yet', async () => {
    mockApi(saved)
    renderEditor()
    await rows()
    expect(screen.getByRole('tab', { name: /Spanish/ })).not.toHaveTextContent('missing')
  })

  it('counts a block field that only one language fills', async () => {
    const localizedHero = {
      ...hero,
      schema: {
        type: 'object',
        properties: {
          title: {
            type: 'object',
            additionalProperties: { type: 'string' },
            backstage: 'localized'
          }
        }
      }
    }
    const content = { title: { en: 'Hi' } }
    mockApi([{ id: 'a', block: 'hero', schemaVersion: 1, content }], {
      descriptions: [localizedHero]
    })
    renderEditor()
    expect(await screen.findByRole('tab', { name: /Spanish/ })).toHaveTextContent('1 missing')
  })
})
