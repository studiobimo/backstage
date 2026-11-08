import { describe, expect, it } from 'vitest'

import { home, regular, send, useFreshPagesDb } from './pages-test-support'

describe('pages API', () => {
  useFreshPagesDb()

  it('creates a page with a slug for each locale', async () => {
    const response = await send('POST', '', regular('about'))
    expect(response.status).toBe(201)
    const { page } = (await response.json()) as { page: { locales: { slug: string }[] } }
    expect(page.locales.map((locale) => locale.slug).sort()).toEqual(['about', 'about-es'])
  })

  it('creates the home page without slugs, once', async () => {
    const first = await send('POST', '', home)
    const { page } = (await first.json()) as { page: { locales: { slug: null }[] } }
    expect(page.locales.map((locale) => locale.slug)).toEqual([null, null])
    expect((await send('POST', '', home)).status).toBe(409)
  })

  it('refuses a slug already used in the same locale', async () => {
    await send('POST', '', regular('about'))
    const response = await send('POST', '', regular('about'))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'slug_taken' })
  })

  it('refuses a missing or malformed slug', async () => {
    expect((await send('POST', '', { ...regular('Bad Slug') })).status).toBe(400)
    expect((await send('POST', '', { isHome: false, titles: home.titles })).status).toBe(400)
  })

  it('renames a page and frees its old slug', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    const renamed = await send('PUT', `/${created.page.id}`, regular('team'))
    expect(renamed.status).toBe(200)
    expect((await send('POST', '', regular('about'))).status).toBe(201)
  })

  it('refuses to turn a page into the home page', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    expect((await send('PUT', `/${created.page.id}`, home)).status).toBe(400)
  })

  it('deletes a page, then answers 404', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    expect((await send('DELETE', `/${created.page.id}`)).status).toBe(204)
    expect((await send('DELETE', `/${created.page.id}`)).status).toBe(404)
    const { pages } = (await (await send('GET', '')).json()) as { pages: unknown[] }
    expect(pages).toEqual([])
  })

  describe('layout', () => {
    const createPage = async () =>
      (
        (await (await send('POST', '', regular('about'))).json()) as {
          page: { id: string }
        }
      ).page.id
    const layoutOf = async (id: string) => {
      const { pages } = (await (await send('GET', '')).json()) as {
        pages: { id: string; layout: string }[]
      }
      return pages.find((page) => page.id === id)?.layout
    }

    it('starts on the default layout', async () => {
      expect(await layoutOf(await createPage())).toBe('default')
    })

    it('saves a registered layout and keeps it across a rename', async () => {
      const id = await createPage()
      expect((await send('PUT', `/${id}/layout`, { layout: 'minimal' })).status).toBe(200)
      await send('PUT', `/${id}`, regular('team'))
      expect(await layoutOf(id)).toBe('minimal')
    })

    it('refuses a layout the registry does not have', async () => {
      const id = await createPage()
      expect((await send('PUT', `/${id}/layout`, { layout: 'nope' })).status).toBe(400)
      expect(await layoutOf(id)).toBe('default')
    })

    it('answers 404 for a page that does not exist', async () => {
      expect((await send('PUT', '/missing/layout', { layout: 'bare' })).status).toBe(404)
    })
  })
})
