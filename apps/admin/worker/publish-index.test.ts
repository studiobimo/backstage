import { afterEach, describe, expect, it, vi } from 'vitest'

import { SEO } from '@studiobimo/backstage'

import { db, kv, regular, send, useFreshPagesDb } from './pages-test-support'
import { publish, publishedIndex } from './publish-test-support'

const createPage = async (slug: string) =>
  ((await (await send('POST', '', regular(slug))).json()) as { page: { id: string } }).page.id

const createPages = (slugs: string[]) => Promise.all(slugs.map(createPage))

const indexedIds = async () => (await publishedIndex()).pages.map(({ pageId }) => pageId).sort()

const countStatementsOf = async (action: (bindings: Partial<Env>) => Promise<unknown>) => {
  let statements = 0
  const counting = new Proxy(db, {
    get: (target, property) => {
      const member = Reflect.get(target, property)
      if (typeof member !== 'function') return member
      return (...args: unknown[]) => {
        if (property === 'prepare') statements += 1
        return member.apply(target, args)
      }
    }
  })
  await action({ DB: counting })
  return statements
}

const siteFailingIndexWriteOnce = () => {
  let failed = false
  return new Proxy(kv, {
    get: (target, property) => {
      if (property === 'put') {
        return (key: string, ...rest: [string]) => {
          if (key !== SEO.indexKey || failed) return target.put(key, ...rest)
          failed = true
          return Promise.reject(new Error('KV PUT failed with 429 Too Many Requests'))
        }
      }
      const member = Reflect.get(target, property)
      return typeof member === 'function' ? member.bind(target) : member
    }
  })
}

describe('sitemap index', () => {
  useFreshPagesDb()
  afterEach(() => vi.restoreAllMocks())

  it('lists every page published concurrently', async () => {
    const ids = await createPages(['about', 'work', 'team', 'press'])
    const responses = await Promise.all(ids.map((id) => publish(id)))
    expect(responses.map(({ status }) => status)).toEqual(ids.map(() => 200))
    expect(await indexedIds()).toEqual([...ids].sort())
  })

  it('removes a page on unpublish and on delete and keeps the others', async () => {
    const [a, b, c] = await createPages(['about', 'work', 'team'])
    await Promise.all([a!, b!, c!].map((id) => publish(id)))
    await send('DELETE', `/${a}/publish`)
    expect(await indexedIds()).toEqual([b!, c!].sort())
    await send('DELETE', `/${b}`)
    expect(await indexedIds()).toEqual([c])
  })

  it('logs a failing index write, still publishes, and repairs it on the next publish', async () => {
    const [a, b] = await createPages(['about', 'work'])
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const bindings = { SITE: siteFailingIndexWriteOnce() }
    expect((await publish(a!, undefined, bindings)).status).toBe(200)
    expect(logged.mock.calls.join()).toContain(SEO.log.rebuildFailed)
    expect(await kv.get(SEO.indexKey)).toBeNull()
    expect((await publish(b!)).status).toBe(200)
    expect(await indexedIds()).toEqual([a!, b!].sort())
  })

  it('reads the published pages in one query however many there are', async () => {
    const [a, b, c, d] = await createPages(['about', 'work', 'team', 'press'])
    await publish(a!)
    const withOnePublished = await countStatementsOf((bindings) => publish(b!, undefined, bindings))
    await publish(c!)
    const withThreePublished = await countStatementsOf((bindings) =>
      publish(d!, undefined, bindings)
    )
    expect(withOnePublished).toBeGreaterThan(0)
    expect(withThreePublished).toBe(withOnePublished)
  })
})
