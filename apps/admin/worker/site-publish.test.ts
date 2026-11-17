import { describe, expect, it } from 'vitest'

import { db, useFreshPagesDb } from './pages-test-support'
import {
  headerWith,
  publicationOf,
  publishedSite,
  publishSite,
  saveHeader,
  saveName,
  saveSettings
} from './site-publish-test-support'

const insertImage = (id: string, extension: string, fileName: string, mime: string, alt: object) =>
  db
    .prepare(`INSERT INTO media VALUES (?, ?, ?, ?, 10, 40, 20, 0, ?, NULL, 1)`)
    .bind(id, `media/${id}.${extension}`, fileName, mime, JSON.stringify(alt))
    .run()

describe('publishing the site', () => {
  useFreshPagesDb()

  it('writes the slots and the site name to the site snapshot of each locale', async () => {
    await saveName({ en: 'Studio' })
    await saveHeader('About us')
    expect((await publishSite()).status).toBe(200)
    for (const locale of ['en', 'es'] as const) {
      const site = await publishedSite(locale)
      expect(site?.slots).toEqual({ header: headerWith('About us') })
      expect(site?.siteName).toBe('Studio')
    }
  })

  it('publishes the default description and social image with the site', async () => {
    await insertImage('d1', 'png', 'a.png', 'image/png', { en: 'A cat', es: 'Un gato' })
    await saveSettings({
      siteName: { en: 'Studio' },
      defaultDescription: { en: 'Studio site', es: 'Sitio del estudio' },
      defaultSocialImage: { id: 'd1', alt: '' }
    })
    await publishSite()
    const es = await publishedSite('es')
    expect(es?.seo).toEqual({ description: 'Sitio del estudio', socialImageId: 'd1' })
    expect(es?.media.d1).toMatchObject({ key: 'media/d1.png', alt: 'Un gato' })
  })

  it('publishes the logo and the theme color as the site brand, with the logo media', async () => {
    await insertImage('l1', 'svg', 'mark.svg', 'image/svg+xml', { en: 'Mark' })
    await saveSettings({
      siteName: { en: 'Studio' },
      logo: { id: 'l1', alt: '' },
      themeColor: '#1A2B3C'
    })
    await publishSite()
    const site = await publishedSite('en')
    expect(site?.brand).toEqual({ logo: { id: 'l1', alt: '' }, themeColor: '#1a2b3c' })
    expect(site?.media.l1).toMatchObject({ key: 'media/l1.svg' })
  })

  it('publishes an empty brand when no logo or theme color is set', async () => {
    await saveName({ en: 'Studio' })
    await publishSite()
    expect((await publishedSite('en'))?.brand).toEqual({ logo: null, themeColor: null })
  })

  it('records who published and when', async () => {
    await saveName({ en: 'Studio' })
    expect(await publicationOf()).toEqual({
      publishedAt: null,
      publishedBy: null,
      hasUnpublishedChanges: true
    })
    await publishSite()
    expect(await publicationOf()).toMatchObject({
      publishedBy: 'Local developer',
      hasUnpublishedChanges: false
    })
  })

  it('keeps draft changes off the site, and flags them, until it is published again', async () => {
    await saveName({ en: 'Studio' })
    await saveHeader('About us')
    await publishSite()
    await saveHeader('Work')
    expect((await publicationOf()).hasUnpublishedChanges).toBe(true)
    expect((await publishedSite('en'))?.slots.header).toEqual(headerWith('About us'))
    await publishSite()
    expect((await publicationOf()).hasUnpublishedChanges).toBe(false)
    expect((await publishedSite('en'))?.slots.header).toEqual(headerWith('Work'))
    await saveName({ en: 'Studio Two' })
    expect((await publicationOf()).hasUnpublishedChanges).toBe(true)
  })
})
