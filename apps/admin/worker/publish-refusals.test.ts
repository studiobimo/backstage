import { hasUnpublishedChanges } from '@studiobimo/backstage/internal'
import { describe, expect, it } from 'vitest'

import {
  createRegularPage,
  regular,
  saveBlocks,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'
import { addMedia, hero, pageKeys, publish, publishedPage } from './publish-test-support'

describe('publishing API refusals and published versions', () => {
  useFreshPagesDb()

  it('refuses a page whose blocks do not validate and writes nothing', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [{ ...hero(), content: { title: 'not localized' } }])
    const response = await publish(id)
    expect(response.status).toBe(422)
    const { problems } = (await response.json()) as { problems: object[] }
    expect(problems).toContainEqual({ reason: 'invalid_content', blockId: 'b1', path: 'title' })
    expect(await pageKeys()).toEqual([])
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
  it('records the published version and reports saved changes until the page is published again', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    expect(await publishedPage(id)).toMatchObject({ publishedAt: null, publishedVersion: null })
    await publish(id)
    const published = await publishedPage(id)
    expect(published.publishedVersion).toBe(await versionOf(id))
    expect(hasUnpublishedChanges(published)).toBe(false)
    await saveBlocks(id, [hero()])
    const edited = await publishedPage(id)
    expect(edited.publishedVersion).toBe(published.publishedVersion)
    expect(hasUnpublishedChanges(edited)).toBe(true)
    await publish(id)
    expect(hasUnpublishedChanges(await publishedPage(id))).toBe(false)
  })
  it('counts a rename as a change that is not live until the page is published again', async () => {
    const id = await createRegularPage()
    await publish(id)
    await send('PUT', `/${id}`, { ...regular('team'), expectedVersion: await versionOf(id) })
    expect(hasUnpublishedChanges(await publishedPage(id))).toBe(true)
  })
  it('clears the published version when the page is unpublished', async () => {
    const id = await createRegularPage()
    await publish(id)
    await send('DELETE', `/${id}/publish`)
    expect(await publishedPage(id)).toMatchObject({ publishedAt: null, publishedVersion: null })
  })
  it('refuses a malformed request', async () => {
    const id = await createRegularPage()
    expect((await send('POST', `/${id}/publish`, {})).status).toBe(400)
  })
})
