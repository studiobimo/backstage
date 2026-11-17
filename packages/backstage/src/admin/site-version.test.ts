import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { SITE_VERSION } from '../publishing.ts'
import type { AdminEnv } from './env.ts'
import { bumpSiteVersionOnPublish } from './site-version.ts'

const setup = () => {
  const records = new Map<string, string>()
  const kv = {
    get: async (key: string) => records.get(key) ?? null,
    list: async () => ({ keys: [] }),
    getWithMetadata: async () => ({ value: null, metadata: null }),
    put: async (key: string, value: string) => void records.set(key, value),
    delete: async (key: string) => void records.delete(key)
  }
  const app = new Hono<{ Bindings: AdminEnv }>()
    .use(bumpSiteVersionOnPublish)
    .post('/publish', async (c) => (await c.env.SITE.put('page:1:en', '{}'), c.json({})))
    .post('/preview', async (c) => (await c.env.SITE.put('preview:token', '{}'), c.json({})))
    .post('/failing', async (c) => (await c.env.SITE.put('page:1:en', '{}'), c.json({}, 409)))
    .post('/republish', async (c) => (await c.env.SITE.put('page:1:en', '{}'), c.json({})))
    .get('/read', (c) => c.json({}))
  const send = (path: string, method = 'POST') =>
    app.request(path, { method }, { SITE: kv } as unknown as AdminEnv)
  return { records, send }
}

describe('bumping the site version on publish', () => {
  it('writes a new version after a request that changed published content', async () => {
    const { records, send } = setup()
    await send('/publish')
    const first = records.get(SITE_VERSION.key)
    await send('/publish')
    expect(first).toBeDefined()
    expect(records.get(SITE_VERSION.key)).not.toBe(first)
  })

  it.each(['/preview', '/failing', '/republish'])(
    'leaves the version alone for %s',
    async (path) => {
      const { records, send } = setup()
      await send(path)
      expect(records.has(SITE_VERSION.key)).toBe(false)
    }
  )

  it('leaves the version alone for a read', async () => {
    const { records, send } = setup()
    await send('/read', 'GET')
    expect(records.has(SITE_VERSION.key)).toBe(false)
  })
})
