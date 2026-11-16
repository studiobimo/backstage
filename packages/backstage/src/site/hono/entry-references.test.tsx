import { describe, expect, it } from 'vitest'

import { createSite } from './create-site.ts'
import { envWith, fixtureOptions, memoryKv, pageSnapshot, siteSnapshot } from './site-fixture.tsx'

const listing = (locale: 'en' | 'es', ids: string[]) =>
  pageSnapshot({
    locale,
    blocks: [
      {
        id: 'b1',
        block: 'post-list',
        schemaVersion: 1,
        content: { posts: { mode: 'chosen', ids: ['ignored'] } }
      }
    ],
    references: { b1: { posts: ids } },
    entries: {
      post: {
        p1: { id: 'p1', schemaVersion: 1, content: { title: { [locale]: `First ${locale}` } } },
        p2: { id: 'p2', schemaVersion: 1, content: { title: { [locale]: `Second ${locale}` } } }
      }
    }
  })

const html = async (snapshots = [listing('en', ['p2', 'p1'])]) =>
  (
    await createSite(fixtureOptions()).request(
      '/about',
      {},
      envWith({}, memoryKv(snapshots, [siteSnapshot()])),
      {
        waitUntil: () => undefined,
        passThroughOnException: () => undefined,
        props: {}
      } as unknown as ExecutionContext
    )
  ).text()

describe('entry references on the site', () => {
  it('hands the block its resolved entries in the snapshot order', async () => {
    expect(await html()).toContain('<ul><li>Second en</li><li>First en</li></ul>')
  })

  it('renders an empty list when the snapshot resolved no entries', async () => {
    expect(await html([listing('en', [])])).toContain('<ul></ul>')
  })
})
