import { SEO } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'

import {
  countingBindings,
  createDraftEntry,
  createEntry,
  deleteEntry,
  editEntry,
  publishedPageWith,
  publishedVersionOf,
  publishEntryAgain,
  saveDraft,
  send,
  snapshotOf,
  titlesIn,
  unpublishEntry
} from './entry-dependents-test-support'
import { useFreshPagesDb } from './pages-test-support'

const chosen = (...ids: string[]) => ({ mode: 'chosen', ids })
const latest = (count: number) => ({ mode: 'latest', count })

describe('republishing the pages that show an entry', () => {
  useFreshPagesDb()

  it('refreshes a page that chose the entry inside the publish request', async () => {
    const id = await createEntry('Alpha')
    const page = await publishedPageWith('about', chosen(id))
    await editEntry(id, 'Alpha v2', 1)
    const { bindings, writes } = countingBindings()
    const response = await send(
      'POST',
      `/collections/post/entries/${id}/publish`,
      { expectedVersion: 2 },
      bindings
    )
    const { republish } = (await response.json()) as { republish: { batch: { done: boolean } } }
    expect(republish.batch.done).toBe(true)
    expect(titlesIn(await snapshotOf(page.id))).toEqual(['Alpha v2'])
    expect(titlesIn(await snapshotOf(page.id, 'es'))).toEqual(['Alpha v2 ES'])
    expect(writes).toHaveLength(2)
    expect(writes).not.toContain(SEO.indexKey)
  })

  it('refreshes a page that shows the latest entries when another is published', async () => {
    await createEntry('Alpha')
    const page = await publishedPageWith('news', latest(5))
    expect(titlesIn(await snapshotOf(page.id))).toEqual(['Alpha'])
    await createEntry('Beta')
    expect(titlesIn(await snapshotOf(page.id)).sort()).toEqual(['Alpha', 'Beta'])
  })

  it('republishes from the published page, never from a newer draft', async () => {
    const id = await createEntry('Alpha')
    const other = await createEntry('Other')
    const page = await publishedPageWith('about', chosen(id))
    await saveDraft(page.id, chosen(id, other), page.version)
    await editEntry(id, 'Alpha v2', 1)
    await publishEntryAgain(id, 2)
    const snapshot = await snapshotOf(page.id)
    expect(titlesIn(snapshot)).toEqual(['Alpha v2'])
    expect(snapshot.version).toBe(page.version)
    expect(await publishedVersionOf(page.id)).toBe(page.version)
  })

  it('leaves pages that do not show the entry alone', async () => {
    const shown = await createEntry('Alpha')
    const unrelated = await createEntry('Beta')
    await publishedPageWith('about', chosen(shown))
    await publishedPageWith('other', chosen(unrelated))
    const { bindings, writes } = countingBindings()
    await send(
      'POST',
      `/collections/post/entries/${shown}/publish`,
      { expectedVersion: 1 },
      bindings
    )
    expect(writes).toHaveLength(2)
  })

  it('drops the entry from pages when it is unpublished or deleted', async () => {
    const kept = await createEntry('Kept')
    const gone = await createEntry('Gone')
    const page = await publishedPageWith('about', chosen(kept, gone))
    await unpublishEntry(gone)
    expect(titlesIn(await snapshotOf(page.id))).toEqual(['Kept'])
    const removed = await deleteEntry(kept)
    expect(removed.pages).toBe(1)
    expect(titlesIn(await snapshotOf(page.id))).toEqual([])
  })

  it('does nothing for an entry that was never published', async () => {
    const id = await createDraftEntry('Draft')
    expect(await deleteEntry(id)).toMatchObject({ pages: 0, pending: false })
  })
})
