import { writeSiteSettings } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import { createRegularPage, db, saveSeo, useFreshPagesDb } from './pages-test-support'
import { addMedia, publish, snapshotOf } from './publish-test-support'

describe('publishing with site settings defaults', () => {
  useFreshPagesDb()

  it('fills a missing description and social image from the site settings', async () => {
    await addMedia('d1')
    await writeSiteSettings(db, {
      siteName: {},
      defaultDescription: { en: 'Studio site', es: 'Sitio del estudio' },
      defaultSocialImage: { id: 'd1', alt: '' }
    })
    const id = await createRegularPage()
    const own = { title: '', description: 'Own', socialImageId: null }
    await saveSeo(id, { en: own, es: { title: '', description: '', socialImageId: null } })
    expect((await publish(id)).status).toBe(200)
    const en = await snapshotOf(id, 'en')
    const es = await snapshotOf(id, 'es')
    expect(en.seo).toEqual({ title: '', description: 'Own', socialImageId: 'd1' })
    expect(es.seo.description).toBe('Sitio del estudio')
    expect(es.media.d1).toMatchObject({ key: 'media/d1.png' })
  })
})
