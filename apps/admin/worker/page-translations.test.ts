import { describe, expect, it } from 'vitest'

import {
  createRegularPage,
  home,
  saveBlocks,
  saveSeo,
  send,
  useFreshPagesDb
} from './pages-test-support'

interface Summary {
  id: string
  missing: { en: number; es: number }
}

const listed = async () => ((await (await send('GET', '')).json()) as { pages: Summary[] }).pages

const hero = (title: Record<string, string>) => ({
  id: crypto.randomUUID(),
  block: 'split-hero',
  schemaVersion: 1,
  content: { title, body: {} }
})

const seo = (en: string, es: string) => ({
  en: { title: en, description: '', socialImageId: null },
  es: { title: es, description: '', socialImageId: null }
})

describe('pages list: missing translations', () => {
  useFreshPagesDb()

  it('reports nothing for a page with no content yet', async () => {
    await createRegularPage()
    expect((await listed())[0]!.missing).toEqual({ en: 0, es: 0 })
  })

  it('counts a localized block field that only one language fills', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [hero({ en: 'Hello' }), hero({ en: 'Hi', es: 'Hola' })])
    expect((await listed())[0]!.missing).toEqual({ en: 0, es: 1 })
  })

  it('counts SEO that only one language fills', async () => {
    const id = await createRegularPage()
    await saveSeo(id, seo('', 'Acerca del estudio'))
    expect((await listed())[0]!.missing).toEqual({ en: 1, es: 0 })
  })

  it('adds blocks and SEO together, page by page', async () => {
    const id = await createRegularPage()
    await send('POST', '', home)
    await saveBlocks(id, [hero({ es: 'Hola' })])
    await saveSeo(id, seo('About', ''))
    const byId = new Map((await listed()).map((page) => [page.id, page.missing]))
    expect(byId.get(id)).toEqual({ en: 1, es: 1 })
    expect([...byId.values()].filter((missing) => missing.en + missing.es === 0)).toHaveLength(1)
  })
})
