import { pagesResponseSchema } from '@studiobimo/backstage/internal'
import { describe, expect, it } from 'vitest'

import { addUsers, ATTRIBUTION, attribute } from './attribution-test-support'
import {
  createPost,
  publishEntry,
  resetDatabaseBeforeEach,
  sendCollections,
  type EntryBody
} from './collections-test-support'
import { createRegularPage, saveBlocks, send } from './pages-test-support'
import { publish, publishedPage } from './publish-test-support'

resetDatabaseBeforeEach()

const entryOf = async (id: string) =>
  ((await (await sendCollections('GET', `/blog/entries/${id}`)).json()) as EntryBody).entry

describe('who saved and published a page', () => {
  it('names the saver and the publisher, falling back to the email', async () => {
    await addUsers()
    const id = await createRegularPage()
    await saveBlocks(id, [])
    await publish(id)
    await attribute('pages', id, 'updated_by', ATTRIBUTION.saver.id)
    await attribute('pages', id, 'published_by', ATTRIBUTION.publisher.id)
    const page = await publishedPage(id)
    expect(page.updatedBy).toBe('Sam Saver')
    expect(page.publishedBy).toBe('publisher@example.com')
    expect(page.updatedAt).toBeGreaterThan(0)
    expect(page.publishedAt).not.toBeNull()
  })

  it('records the editor who saved and who published', async () => {
    const id = await createRegularPage()
    await saveBlocks(id, [])
    await publish(id)
    const page = await publishedPage(id)
    expect([page.updatedBy, page.publishedBy]).toEqual(['Local developer', 'Local developer'])
  })

  it('answers null when nobody published or the user is gone', async () => {
    const id = await createRegularPage()
    await attribute('pages', id, 'updated_by', null)
    const [page] = pagesResponseSchema.parse(await (await send('GET', '')).json()).pages
    expect([page!.updatedBy, page!.publishedAt, page!.publishedBy]).toEqual([null, null, null])
  })
})

describe('who saved and published an entry', () => {
  it('names the saver and the publisher, falling back to the email', async () => {
    await addUsers()
    const { id } = await createPost()
    await publishEntry(id, 1)
    await attribute('entries', id, 'updated_by', ATTRIBUTION.saver.id)
    await attribute('entries', id, 'published_by', ATTRIBUTION.publisher.id)
    const entry = await entryOf(id)
    expect([entry.updatedBy, entry.publishedBy]).toEqual(['Sam Saver', 'publisher@example.com'])
  })

  it('answers null when never published or the user is gone', async () => {
    const { id } = await createPost()
    await attribute('entries', id, 'updated_by', null)
    const entry = await entryOf(id)
    expect([entry.updatedBy, entry.publishedBy]).toEqual([null, null])
  })
})
