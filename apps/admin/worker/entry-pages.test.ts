import { kvWritesToRepublish, resolveLocaleConfig } from '@studiobimo/backstage/internal'
import { publishedIndexSchema, SEO } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'

import {
  createNews,
  entryKeys,
  newsContent,
  newsSnapshot,
  publishNews,
  resetDatabaseBeforeEach,
  sendFaq,
  sendNews,
  type RoutedEntryBody
} from './entry-pages-test-support'
import { db, kv } from './pages-test-support'

resetDatabaseBeforeEach()

const rename = async (id: string, version: number, title: string, slugs?: object) =>
  sendNews('PUT', `/entries/${id}`, {
    content: newsContent(title),
    expectedVersion: version,
    slugs
  })

const publishedIndex = async () => publishedIndexSchema.parse(await kv.get(SEO.indexKey, 'json'))

describe('entry slugs', () => {
  it('derives a slug per locale from the label', async () => {
    const { status, entry } = await createNews('Big launch!')
    expect(status).toBe(201)
    expect(entry.slugs).toEqual({ en: 'big-launch', es: 'big-launch-es' })
  })

  it('keeps slugs unique per locale by numbering the later entry', async () => {
    await createNews('Big launch')
    const second = await createNews('Big launch')
    expect(second.entry.slugs).toEqual({ en: 'big-launch-2', es: 'big-launch-es-2' })
  })

  it('takes the slugs the editor typed and refuses one that is already used', async () => {
    await createNews('Big launch')
    const typed = await createNews('Other', { slugs: { en: 'custom' } })
    expect(typed.entry.slugs).toEqual({ en: 'custom', es: 'other-es' })
    const clash = await createNews('Third', { slugs: { en: 'big-launch' } })
    expect(clash.status).toBe(409)
    const invalid = await createNews('Fourth', { slugs: { en: 'Not A Slug' } })
    expect(invalid.status).toBe(400)
  })

  it('keeps the slug when the label changes and changes it only when asked', async () => {
    const { entry } = await createNews('Big launch')
    const kept = (await (await rename(entry.id, 1, 'Renamed')).json()) as RoutedEntryBody
    expect(kept.entry.slugs.en).toBe('big-launch')
    const changed = (await (
      await rename(entry.id, 2, 'Renamed', { en: 'renamed' })
    ).json()) as RoutedEntryBody
    expect(changed.entry.slugs).toEqual({ en: 'renamed', es: 'big-launch-es' })
  })

  it('gives entries of a collection without a route no slugs', async () => {
    const response = await sendFaq('POST', '/entries', { content: { question: 'Why?' } })
    expect(((await response.json()) as RoutedEntryBody).entry.slugs).toEqual({})
  })
})

describe('publishing an entry of a routed collection', () => {
  it('writes a snapshot and a route key per locale and lists the entry in the sitemap index', async () => {
    const { entry } = await createNews('Big launch')
    expect((await publishNews(entry.id)).status).toBe(200)
    expect((await entryKeys()).sort()).toEqual(
      [
        `entry:news:${entry.id}:en`,
        `entry:news:${entry.id}:es`,
        'route:en:news/big-launch',
        'route:es:news/big-launch-es'
      ].sort()
    )
    expect(await kv.get('route:en:news/big-launch')).toBe(entry.id)
    expect(await newsSnapshot(entry.id, 'es')).toMatchObject({
      slug: 'big-launch-es',
      title: 'Big launch ES',
      content: { title: { es: 'Big launch ES' } }
    })
    expect((await publishedIndex()).entries).toMatchObject([
      { collection: 'news', entryId: entry.id, slugs: { en: 'big-launch', es: 'big-launch-es' } }
    ])
  })

  it('costs the KV writes of one republished page', async () => {
    const { entry } = await createNews('Big launch')
    await publishNews(entry.id)
    expect((await kv.list()).keys).toHaveLength(
      kvWritesToRepublish(1, resolveLocaleConfig().locales)
    )
  })

  it('moves the route when the slug changes so the old one never serves the entry', async () => {
    const { entry } = await createNews('Big launch')
    await publishNews(entry.id)
    await rename(entry.id, 1, 'Big launch', { en: 'launch' })
    await publishNews(entry.id, 2)
    expect(await kv.get('route:en:news/big-launch')).toBeNull()
    expect(await kv.get('route:en:news/launch')).toBe(entry.id)
    expect((await newsSnapshot(entry.id, 'en')).slug).toBe('launch')
  })

  it('leaves another entry owning a route it has taken over', async () => {
    const first = await createNews('Big launch')
    await publishNews(first.entry.id)
    await rename(first.entry.id, 1, 'Big launch', { en: 'moved' })
    const second = await createNews('Other', { slugs: { en: 'big-launch' } })
    await publishNews(second.entry.id)
    await publishNews(first.entry.id, 2)
    expect(await kv.get('route:en:news/big-launch')).toBe(second.entry.id)
  })

  it('refuses to publish an entry whose label gives no slug', async () => {
    const { entry } = await createNews('???', {})
    const response = await publishNews(entry.id)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      problems: [{ reason: 'missing_slug' }]
    })
    expect(await entryKeys()).toEqual([])
  })
})

describe('taking a published entry down', () => {
  it('removes the snapshots, the routes and the index entry when unpublished', async () => {
    const { entry } = await createNews('Big launch')
    await publishNews(entry.id)
    expect((await sendNews('DELETE', `/entries/${entry.id}/publish`)).status).toBe(200)
    expect(await entryKeys()).toEqual([])
    expect((await publishedIndex()).entries).toEqual([])
  })

  it('removes them too when the published entry is deleted', async () => {
    const { entry } = await createNews('Big launch')
    await publishNews(entry.id)
    expect((await sendNews('DELETE', `/entries/${entry.id}`)).status).toBe(200)
    expect(await entryKeys()).toEqual([])
    expect((await publishedIndex()).entries).toEqual([])
  })
})

describe('entries that need no pages', () => {
  it('writes nothing for a collection without a route', async () => {
    const created = await sendFaq('POST', '/entries', { content: { question: 'Why?' } })
    const { entry } = (await created.json()) as RoutedEntryBody
    await sendFaq('POST', `/entries/${entry.id}/publish`, { expectedVersion: 1 })
    expect((await kv.list()).keys).toEqual([])
  })

  it('derives missing slugs at publish, as for an entry saved before its collection had a route', async () => {
    const { entry } = await createNews('Older')
    await db.prepare('DELETE FROM entry_locales').run()
    expect((await publishNews(entry.id)).status).toBe(200)
    expect(await kv.get('route:en:news/older')).toBe(entry.id)
  })
})
