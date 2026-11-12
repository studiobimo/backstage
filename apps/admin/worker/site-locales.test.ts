import { defineRegistry } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { describe, expect, it } from 'vitest'

import { sendApi, sendTo, useFreshPagesDb } from './pages-test-support'

const frenchOnly = createAdmin(defineRegistry([], { locales: ['fr'] }))

const createFrenchHome = async () =>
  (
    (await (
      await sendTo(frenchOnly, 'POST', '/pages', { isHome: true, titles: { fr: 'Accueil' } })
    ).json()) as { page: { id: string; version: number } }
  ).page

describe('a site configured with locales', () => {
  useFreshPagesDb()

  it('tells the admin which locales it serves and which is the default', async () => {
    expect(await (await sendApi('/config')).json()).toEqual({
      locales: ['en', 'es'],
      defaultLocale: 'en'
    })
    expect(await (await sendTo(frenchOnly, 'GET', '/config')).json()).toEqual({
      locales: ['fr'],
      defaultLocale: 'fr'
    })
  })

  it('creates pages with a title for each configured locale only', async () => {
    await createFrenchHome()
    const refused = await sendTo(frenchOnly, 'POST', '/pages', {
      isHome: false,
      slugs: { en: 'about', es: 'acerca' },
      titles: { en: 'About', es: 'Acerca' }
    })
    expect(refused.status).toBe(400)
  })

  it('lists the missing translations of each configured locale', async () => {
    await createFrenchHome()
    const { pages } = (await (await sendTo(frenchOnly, 'GET', '/pages')).json()) as {
      pages: { missing: Record<string, number>; locales: { locale: string }[] }[]
    }
    expect(pages[0]?.missing).toEqual({ fr: 0 })
    expect(pages[0]?.locales.map(({ locale }) => locale)).toEqual(['fr'])
  })

  it('stores search metadata for the configured locales only', async () => {
    const page = await createFrenchHome()
    const seo = { title: 'Accueil', description: '', socialImageId: null }
    const saved = await sendTo(frenchOnly, 'PUT', `/pages/${page.id}/seo`, {
      fr: seo,
      expectedVersion: page.version
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ seo: { fr: seo } })
    const refused = await sendTo(frenchOnly, 'PUT', `/pages/${page.id}/seo`, {
      en: seo,
      expectedVersion: page.version + 1
    })
    expect(refused.status).toBe(400)
  })
})
