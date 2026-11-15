import { PAGE_PREVIEW } from '@studiobimo/backstage/internal'
import { snapshotSchema } from '@studiobimo/backstage/site'
import { describe, expect, it, vi } from 'vitest'

import {
  createRegularPage,
  kv,
  saveBlocks,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'
import { addMedia, hero } from './publish-test-support'

const ONE_HOUR_SECONDS = 3600
const NOT_FOUND = 404
const UNPUBLISHABLE = 422
const CREATED = 201

const recordingSite = () => {
  const put = vi.fn((key: string, value: string, options?: KVNamespacePutOptions) =>
    kv.put(key, value, options)
  )
  return { put, bindings: { SITE: { put } as unknown as KVNamespace } }
}

const preview = (id: string, bindings: Partial<Env> = {}) =>
  send('POST', `/${id}/preview`, undefined, bindings)

describe('draft preview API', () => {
  useFreshPagesDb()

  it('writes the draft snapshots to a random KV key that expires after an hour', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    await saveBlocks(id, [hero()])
    const site = recordingSite()
    const before = Date.now()
    const response = await preview(id, site.bindings)
    expect(response.status).toBe(CREATED)
    const body = (await response.json()) as { token: string; path: string; expiresAt: number }
    expect(body.token).toHaveLength(PAGE_PREVIEW.token.length)
    expect(body.path).toBe(`${PAGE_PREVIEW.path}/${body.token}`)
    expect(body.expiresAt).toBeGreaterThanOrEqual(
      before + ONE_HOUR_SECONDS * PAGE_PREVIEW.millisecondsPerSecond
    )
    expect(site.put).toHaveBeenCalledTimes(1)
    expect(site.put.mock.calls[0]?.[0]).toBe(`preview:${body.token}`)
    expect(site.put.mock.calls[0]?.[2]).toEqual({ expirationTtl: ONE_HOUR_SECONDS })
    const stored = (await kv.get(`preview:${body.token}`, 'json')) as {
      expiresAt: number
      snapshots: unknown[]
    }
    expect(stored.expiresAt).toBe(body.expiresAt)
    const [en, es] = stored.snapshots.map((snapshot) => snapshotSchema.parse(snapshot))
    expect([en?.locale, es?.locale]).toEqual(['en', 'es'])
    expect(en?.blocks).toHaveLength(1)
    expect(en?.media.m1).toMatchObject({ key: 'media/m1.png' })
  })

  it('gives every preview its own token and publishes nothing', async () => {
    const id = await createRegularPage()
    const first = (await (await preview(id)).json()) as { token: string }
    const second = (await (await preview(id)).json()) as { token: string }
    expect(first.token).not.toBe(second.token)
    expect((await kv.list()).keys.map(({ name }) => name).sort()).toEqual(
      [`preview:${first.token}`, `preview:${second.token}`].sort()
    )
  })

  it('previews the saved draft without changing the page version', async () => {
    const id = await createRegularPage()
    const version = await versionOf(id)
    await preview(id)
    expect(await versionOf(id)).toBe(version)
  })

  it('refuses a draft that would not publish and writes nothing', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [{ ...hero(), content: { title: 'not localized' } }])
    const response = await preview(id)
    expect(response.status).toBe(UNPUBLISHABLE)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'invalid_content', blockId: 'b1' }]
    })
    expect((await kv.list()).keys).toEqual([])
  })

  it('answers 404 for a page that does not exist', async () => {
    const response = await preview('missing')
    expect(response.status).toBe(NOT_FOUND)
    expect((await kv.list()).keys).toEqual([])
  })
})
