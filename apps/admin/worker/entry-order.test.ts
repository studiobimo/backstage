import { describe, expect, it } from 'vitest'

import {
  createEntry,
  publishedPageWith,
  send,
  snapshotOf,
  titlesIn
} from './entry-dependents-test-support'
import { useFreshPagesDb } from './pages-test-support'

const ORDER_PATH = '/collections/post/order'

interface Listed {
  id: string
  position: number
}

const listPositions = async () =>
  ((await (await send('GET', '/collections/post/entries')).json()) as { entries: Listed[] }).entries
    .sort((a, b) => a.position - b.position)
    .map(({ id }) => id)

describe('ordering entries by hand', () => {
  useFreshPagesDb()

  it('puts a new entry at the end', async () => {
    const first = await createEntry('Alpha')
    const second = await createEntry('Beta')
    const third = await createEntry('Gamma')
    expect(await listPositions()).toEqual([first, second, third])
  })

  it('stores the dropped order and keeps entries left out of the request after it', async () => {
    const first = await createEntry('Alpha')
    const second = await createEntry('Beta')
    const third = await createEntry('Gamma')
    const response = await send('PUT', ORDER_PATH, { ids: [third, first] })
    expect(response.status).toBe(200)
    expect(await listPositions()).toEqual([third, first, second])
  })

  it('refuses an id that is not in the collection and changes nothing', async () => {
    const first = await createEntry('Alpha')
    const second = await createEntry('Beta')
    const response = await send('PUT', ORDER_PATH, { ids: [second, 'missing'] })
    expect(response.status).toBe(400)
    expect(await listPositions()).toEqual([first, second])
  })

  it('refuses an empty order and an unknown collection', async () => {
    expect((await send('PUT', ORDER_PATH, { ids: [] })).status).toBe(400)
    expect((await send('PUT', '/collections/nope/order', { ids: ['a'] })).status).toBe(404)
  })

  it('does not touch the entries version or draft state', async () => {
    const id = await createEntry('Alpha')
    const other = await createEntry('Beta')
    await send('PUT', ORDER_PATH, { ids: [other, id] })
    const read = (await (await send('GET', `/collections/post/entries/${id}`)).json()) as {
      entry: { version: number }
    }
    expect(read.entry.version).toBe(1)
  })

  it('republishes the pages that show the collection', async () => {
    const first = await createEntry('Alpha')
    const second = await createEntry('Beta')
    const page = await publishedPageWith('about', { mode: 'chosen', ids: [first, second] })
    const response = await send('PUT', ORDER_PATH, { ids: [second, first] })
    const body = (await response.json()) as { republish: { pages: number } }
    expect(body.republish.pages).toBe(1)
    expect(titlesIn(await snapshotOf(page.id))).toHaveLength(2)
  })
})
