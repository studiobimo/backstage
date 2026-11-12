import { describe, expect, it } from 'vitest'

import { routeKey } from '@studiobimo/backstage'

import {
  createRegularPage,
  kv,
  regular,
  saveBlocks,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'
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

  const rename = async (id: string, slug: string) =>
    send('PUT', `/${id}`, { ...regular(slug), expectedVersion: await versionOf(id) })
  const createPage = async (slug: string) =>
    ((await (await send('POST', '', regular(slug))).json()) as { page: { id: string } }).page.id

  it('keeps a route that another page owns when the old owner is unpublished', async () => {
    const a = await createPage('about')
    await publish(a)
    await rename(a, 'team')
    const b = await createPage('about')
    await publish(b)
    expect((await send('DELETE', `/${a}/publish`)).status).toBe(200)
    expect(await kv.get(routeKey('en', 'about'))).toBe(b)
    expect(await kv.get(routeKey('es', 'about-es'))).toBe(b)
    expect(await pageKeys()).toContain(routeKey('en', 'about'))
  })

  it('keeps a route that another page owns when the old owner is deleted', async () => {
    const a = await createPage('about')
    await publish(a)
    await rename(a, 'team')
    const b = await createPage('about')
    await publish(b)
    expect((await send('DELETE', `/${a}`)).status).toBe(204)
    expect(await kv.get(routeKey('en', 'about'))).toBe(b)
  })

  it('removes the old routes when a renamed page is republished', async () => {
    const id = await createPage('about')
    await publish(id)
    await rename(id, 'team')
    await publish(id)
    expect(await kv.get(routeKey('en', 'about'))).toBeNull()
    expect(await kv.get(routeKey('en', 'team'))).toBe(id)
  })

  it('republishing never removes the old route of a page that took it over', async () => {
    const a = await createPage('about')
    await publish(a)
    await rename(a, 'team')
    const b = await createPage('about')
    await publish(b)
    await publish(a)
    expect(await kv.get(routeKey('en', 'about'))).toBe(b)
    expect(await kv.get(routeKey('en', 'team'))).toBe(a)
  })
})
