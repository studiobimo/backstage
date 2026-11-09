import { routeKey } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import {
  createRegularPage,
  kv,
  saveBlocks,
  saveSeo,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'
import { addMedia, hero, publish, publishedPage, snapshotOf } from './publish-test-support'

describe('publishing API', () => {
  useFreshPagesDb()

  it('writes one snapshot per locale and records who published and when', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    await saveBlocks(id, [hero()])
    const response = await publish(id)
    expect(response.status).toBe(200)
    const en = await snapshotOf(id, 'en')
    const es = await snapshotOf(id, 'es')
    expect([en.slug, es.slug]).toEqual(['about', 'about-es'])
    expect(en.blocks).toHaveLength(1)
    expect(en.media.m1).toMatchObject({ key: 'media/m1.png', alt: 'A cat' })
    expect(es.media.m1).toMatchObject({ alt: 'Un gato' })
    const page = await publishedPage(id)
    expect(page.publishedAt).toBe(en.publishedAt)
    expect(page.publishedBy).toBe('Local developer')
    expect(await kv.get(routeKey('en', 'about'))).toBe(id)
    expect(await kv.get(routeKey('es', 'about-es'))).toBe(id)
  })
  it('publishes the social image with the snapshot', async () => {
    await addMedia('m2')
    const id = await createRegularPage()
    const seo = { title: '', description: 'About', socialImageId: 'm2' }
    await saveSeo(id, { en: seo, es: { ...seo, socialImageId: null } })
    expect((await publish(id)).status).toBe(200)
    expect((await snapshotOf(id, 'en')).media.m2).toMatchObject({ key: 'media/m2.png' })
    expect((await snapshotOf(id, 'es')).media).toEqual({})
  })
  it('refuses a page whose blocks do not validate and writes nothing', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [{ ...hero(), content: { title: 'not localized' } }])
    const response = await publish(id)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'invalid_content', blockId: 'b1' }]
    })
    expect((await kv.list()).keys).toEqual([])
    expect((await publishedPage(id)).publishedAt).toBeNull()
  })
  it('refuses a block that points at missing media', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [hero('gone')])
    const response = await publish(id)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      problems: [{ reason: 'unknown_media', blockId: 'b1' }]
    })
  })
  it('refuses a stale version, then answers 404 for an unknown page', async () => {
    const id = await createRegularPage()
    const stale = await publish(id, (await versionOf(id)) + 1)
    expect(stale.status).toBe(409)
    expect(await stale.json()).toMatchObject({ code: 'stale_version' })
    expect((await publish('missing', 1)).status).toBe(404)
  })
  it('refuses a malformed request', async () => {
    const id = await createRegularPage()
    expect((await send('POST', `/${id}/publish`, {})).status).toBe(400)
  })
})
