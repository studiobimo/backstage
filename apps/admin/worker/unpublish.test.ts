import { describe, expect, it } from 'vitest'

import { createRegularPage, saveBlocks, send, useFreshPagesDb } from './pages-test-support'
import {
  pageKeys,
  publish,
  publishedIndex,
  publishedPage,
  snapshotOf
} from './publish-test-support'

describe('unpublishing API', () => {
  useFreshPagesDb()

  it('unpublishes: removes the snapshots and clears the record', async () => {
    const id = await createRegularPage()
    await publish(id)
    const response = await send('DELETE', `/${id}/publish`)
    expect(response.status).toBe(200)
    expect(await pageKeys()).toEqual([])
    expect((await publishedIndex()).pages).toEqual([])
    const page = await publishedPage(id)
    expect([page.publishedAt, page.publishedBy]).toEqual([null, null])
    expect((await send('DELETE', '/missing/publish')).status).toBe(404)
  })
  it('republishing replaces the snapshots in place', async () => {
    const id = await createRegularPage()
    await publish(id)
    await saveBlocks(id, [])
    await publish(id)
    expect(await pageKeys()).toHaveLength(4)
    expect((await snapshotOf(id, 'en')).version).toBe(2)
  })
  it('removes the snapshots when a published page is deleted', async () => {
    const id = await createRegularPage()
    await publish(id)
    expect((await send('DELETE', `/${id}`)).status).toBe(204)
    expect(await pageKeys()).toEqual([])
    expect((await publishedIndex()).pages).toEqual([])
  })
})
