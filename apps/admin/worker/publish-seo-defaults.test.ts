import { ensureUser, writeSiteSettings } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import { createRegularPage, db, saveSeo, useFreshPagesDb } from './pages-test-support'
import { addMedia, publish, snapshotOf } from './publish-test-support'

describe('publishing a page when the site settings have defaults', () => {
  useFreshPagesDb()

  it('leaves a missing description and social image empty, for the site snapshot to fill', async () => {
    await addMedia('d1')
    const editorId = await ensureUser(db, { email: 'editor@example.test', name: 'Editor' })
    await writeSiteSettings(
      db,
      {
        siteName: {},
        defaultDescription: { en: 'Studio site', es: 'Sitio del estudio' },
        defaultSocialImage: { id: 'd1', alt: '' }
      },
      { expectedVersion: 0, editorId }
    )
    const id = await createRegularPage()
    const own = { title: '', description: 'Own', socialImageId: null }
    await saveSeo(id, { en: own, es: { title: '', description: '', socialImageId: null } })
    expect((await publish(id)).status).toBe(200)
    const en = await snapshotOf(id, 'en')
    const es = await snapshotOf(id, 'es')
    expect(en.seo).toEqual({ title: '', description: 'Own', socialImageId: null })
    expect(es.seo.description).toBe('')
    expect(es.media).toEqual({})
  })
})
