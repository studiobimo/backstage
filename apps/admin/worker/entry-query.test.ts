import { createAdmin } from '@studiobimo/backstage/admin'
import { defineBlock, defineCollection, defineRegistry, entries } from '@studiobimo/backstage'
import { snapshotKey, snapshotSchema } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { db, kv, regular, sendTo, useFreshPagesDb } from './pages-test-support'

const CATEGORY = { starter: 'starter', main: 'main', dessert: 'dessert' } as const

const dish = defineCollection({
  name: 'dish',
  label: 'name',
  schema: z.object({
    name: z.string().min(1),
    category: z.enum([CATEGORY.starter, CATEGORY.main, CATEGORY.dessert]),
    available: z.boolean().default(true),
    price: z.number().default(0)
  })
})

const menu = defineBlock({
  name: 'menu',
  schema: z.object({ dishes: entries(dish, { max: 5 }) })
})

const admin = createAdmin(defineRegistry([menu], { collections: [dish] }))

const send = (method: string, path: string, body?: unknown) => sendTo(admin, method, path, body)

const createDish = async (name: string, category: string, extra: object = {}, publish = true) => {
  const created = (await (
    await send('POST', '/collections/dish/entries', { content: { name, category, ...extra } })
  ).json()) as { entry: { id: string; version: number } }
  const { id, version } = created.entry
  if (publish) {
    await send('POST', `/collections/dish/entries/${id}/publish`, { expectedVersion: version })
  }
  return id
}

let pageCount = 0

const tryPublishMenu = async (dishes: unknown) => {
  pageCount += 1
  const { page } = (await (await send('POST', '/pages', regular(`menu-${pageCount}`))).json()) as {
    page: { id: string; version: number }
  }
  await send('PUT', `/pages/${page.id}/blocks`, {
    blocks: [{ id: `b-${page.id}`, block: 'menu', schemaVersion: 1, content: { dishes } }],
    expectedVersion: page.version
  })
  const blocks = (await (await send('GET', `/pages/${page.id}/blocks`)).json()) as {
    version: number
  }
  const published = await send('POST', `/pages/${page.id}/publish`, {
    expectedVersion: blocks.version
  })
  return { id: page.id, status: published.status }
}

const menuPage = async (dishes: unknown) => {
  const { id, status } = await tryPublishMenu(dishes)
  expect(status).toBe(200)
  return id
}

const snapshotOf = async (id: string) =>
  snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(id, 'en')))!))

const firstBlockOf = <T>(
  snapshot: Awaited<ReturnType<typeof snapshotOf>>,
  byBlock: Record<string, T>
) => byBlock[`b-${snapshot.pageId}`]

const namesOf = (snapshot: Awaited<ReturnType<typeof snapshotOf>>, ids: readonly string[]) =>
  ids.map((id) => (snapshot.entries.dish?.[id]?.content as { name: string }).name)

const listedNames = async (id: string) => {
  const snapshot = await snapshotOf(id)
  return namesOf(snapshot, firstBlockOf(snapshot, snapshot.references)?.dishes ?? [])
}

const refsOf = async (id: string) =>
  (
    await db
      .prepare('SELECT collection, entry_id FROM page_entry_refs WHERE page_id = ?')
      .bind(id)
      .all<{ collection: string; entry_id: string | null }>()
  ).results

const query = (extra: object = {}) => ({ mode: 'query', limit: 5, ...extra })

describe('listing a collection by query', () => {
  useFreshPagesDb()

  it('keeps only the published entries that match where', async () => {
    await createDish('Soup', CATEGORY.starter)
    await createDish('Steak', CATEGORY.main)
    await createDish('Pasta', CATEGORY.main, { available: false })
    await createDish('Draft', CATEGORY.main, {}, false)
    const id = await menuPage(query({ where: { category: CATEGORY.main, available: true } }))
    expect(await listedNames(id)).toEqual(['Steak'])
  })

  it('orders by the manual position, then by a field, and honours the limit', async () => {
    const soup = await createDish('Soup', CATEGORY.starter, { price: 9 })
    const steak = await createDish('Steak', CATEGORY.main, { price: 20 })
    await createDish('Cake', CATEGORY.dessert, { price: 7 })
    await send('PUT', '/collections/dish/order', { ids: [steak, soup] })
    const manual = await menuPage(
      query({ orderBy: { field: '$position', direction: 'asc' }, limit: 2 })
    )
    expect(await listedNames(manual)).toEqual(['Steak', 'Soup'])
    const byPrice = await menuPage(query({ orderBy: { field: 'price', direction: 'desc' } }))
    expect(await listedNames(byPrice)).toEqual(['Steak', 'Soup', 'Cake'])
  })

  it('groups by an enum in its declared order and leaves out empty groups', async () => {
    await createDish('Cake', CATEGORY.dessert)
    await createDish('Soup', CATEGORY.starter)
    await createDish('Salad', CATEGORY.starter)
    const id = await menuPage(query({ groupBy: 'category' }))
    const snapshot = await snapshotOf(id)
    expect(
      firstBlockOf(snapshot, snapshot.groups ?? {})?.dishes?.map(({ group, ids }) => ({
        group,
        names: namesOf(snapshot, ids)
      }))
    ).toEqual([
      { group: CATEGORY.starter, names: ['Soup', 'Salad'] },
      { group: CATEGORY.dessert, names: ['Cake'] }
    ])
  })

  it('depends on the whole collection and refreshes when an entry is published', async () => {
    await createDish('Soup', CATEGORY.starter)
    const id = await menuPage(query())
    expect(await refsOf(id)).toEqual([{ collection: 'dish', entry_id: null }])
    const added = await createDish('Cake', CATEGORY.dessert, {}, false)
    const published = await send('POST', `/collections/dish/entries/${added}/publish`, {
      expectedVersion: 1
    })
    const body = (await published.json()) as { republish: { pages: number } }
    expect(body.republish.pages).toBe(1)
    expect(await listedNames(id)).toEqual(['Soup', 'Cake'])
  })

  it('refreshes when the entries are reordered', async () => {
    const soup = await createDish('Soup', CATEGORY.starter)
    const cake = await createDish('Cake', CATEGORY.dessert)
    const id = await menuPage(query({ orderBy: { field: '$position', direction: 'asc' } }))
    expect(await listedNames(id)).toEqual(['Soup', 'Cake'])
    await send('PUT', '/collections/dish/order', { ids: [cake, soup] })
    expect(await listedNames(id)).toEqual(['Cake', 'Soup'])
  })

  it('does not publish a page whose limit is above the field maximum', async () => {
    expect((await tryPublishMenu(query({ limit: 6 }))).status).not.toBe(200)
  })
})
