import { describe, expect, it } from 'vitest'

import { home, regular, send, useFreshPagesDb, versionOf } from './pages-test-support'

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

  it('lets only one of two concurrent home page creates succeed', async () => {
    const responses = await Promise.all([send('POST', '', home), send('POST', '', home)])
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    const refused = responses.find((response) => response.status === 409)
    expect(await refused?.json()).toMatchObject({ code: 'home_taken' })
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
    const renamed = await send('PUT', `/${created.page.id}`, {
      ...regular('team'),
      expectedVersion: await versionOf(created.page.id)
    })
    expect(renamed.status).toBe(200)
    expect((await send('POST', '', regular('about'))).status).toBe(201)
  })

  it('refuses to turn a page into the home page', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    const turned = await send('PUT', `/${created.page.id}`, { ...home, expectedVersion: 1 })
    expect(turned.status).toBe(400)
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
})
