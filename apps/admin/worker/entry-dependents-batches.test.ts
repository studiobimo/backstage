import { describe, expect, it } from 'vitest'

import {
  countingBindings,
  createEntry,
  drive,
  editEntry,
  publishedPageWith,
  publishEntryAgain,
  send,
  snapshotOf,
  titlesIn
} from './entry-dependents-test-support'
import { useFreshPagesDb } from './pages-test-support'

const chosen = (...ids: string[]) => ({ mode: 'chosen', ids })

describe('republishing dependents beyond one batch', () => {
  useFreshPagesDb()

  it('hands back a cursor beyond one batch and finishes through the batch endpoint', async () => {
    const id = await createEntry('Alpha')
    const pages = []
    for (const slug of ['a', 'b', 'c', 'd', 'e'])
      pages.push(await publishedPageWith(slug, chosen(id)))
    await editEntry(id, 'Alpha v2', 1)
    const republish = await publishEntryAgain(id, 2)
    expect(republish).toMatchObject({ pages: 5, writes: 10, pending: true, batch: null })
    const status = await send('GET', `/republish?collection=post&entryId=${id}`)
    expect(await status.json()).toMatchObject({ status: { remaining: 5, writes: 10 } })
    const { bindings, writes } = countingBindings()
    const batches = await drive({ collection: 'post', entryId: id }, bindings)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches.flatMap(({ republished }) => republished).sort()).toEqual(
      pages.map(({ id: pageId }) => pageId).sort()
    )
    expect(writes).toHaveLength(10)
    expect(batches.reduce((sum, { writes: count }) => sum + count, 0)).toBe(10)
    for (const { id: pageId } of pages) {
      expect(titlesIn(await snapshotOf(pageId))).toEqual(['Alpha v2'])
    }
  })
})
