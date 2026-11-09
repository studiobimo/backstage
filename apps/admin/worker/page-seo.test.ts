import { describe, expect, it } from 'vitest'

import {
  createRegularPage,
  regular,
  saveSeo,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'

const seoFor = (title: string) => ({
  en: { title, description: 'About us', socialImageId: null },
  es: { title: '', description: '', socialImageId: null }
})

const readSeo = async (id: string) =>
  ((await (await send('GET', `/${id}/seo`)).json()) as { seo: unknown }).seo

describe('page SEO API', () => {
  useFreshPagesDb()

  it('starts empty for every locale', async () => {
    const id = await createRegularPage()
    expect(await readSeo(id)).toEqual({
      en: { title: '', description: '', socialImageId: null },
      es: { title: '', description: '', socialImageId: null }
    })
  })

  it('saves per locale and survives a rename', async () => {
    const id = await createRegularPage()
    expect((await saveSeo(id, seoFor('About the studio'))).status).toBe(200)
    await send('PUT', `/${id}`, regular('team'))
    expect(await readSeo(id)).toEqual(seoFor('About the studio'))
  })

  it('refuses text that is too long', async () => {
    const id = await createRegularPage()
    expect((await saveSeo(id, seoFor('x'.repeat(71)))).status).toBe(400)
  })

  it('refuses a social image that is not in the media library', async () => {
    const id = await createRegularPage()
    const seo = { ...seoFor('About'), en: { ...seoFor('About').en, socialImageId: 'missing' } }
    expect((await saveSeo(id, seo)).status).toBe(400)
  })

  it('moves the page version forward and refuses a save over a newer one', async () => {
    const id = await createRegularPage()
    const before = await versionOf(id)
    expect((await saveSeo(id, seoFor('First'), before)).status).toBe(200)
    expect(await versionOf(id)).toBe(before + 1)
    const stale = await saveSeo(id, seoFor('Second'), before)
    expect(stale.status).toBe(409)
    expect(((await readSeo(id)) as { en: { title: string } }).en.title).toBe('First')
  })

  it('answers 404 for a page that does not exist', async () => {
    expect((await send('GET', '/missing/seo')).status).toBe(404)
    expect((await saveSeo('missing', seoFor('x'), 1)).status).toBe(404)
  })
})
