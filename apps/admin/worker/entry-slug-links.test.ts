import { createAdmin } from '@studiobimo/backstage/admin'
import {
  defineBlock,
  defineCollection,
  defineRegistry,
  entries,
  localized
} from '@studiobimo/backstage'
import { snapshotKey, snapshotSchema } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { kv, regular, sendTo, useFreshPagesDb } from './pages-test-support'

const story = defineCollection({
  name: 'story',
  label: 'title',
  route: { path: '/stories/:slug' },
  schema: z.object({ title: localized(z.string().min(1)) })
})

const storyList = defineBlock({
  name: 'story-list',
  schema: z.object({ stories: entries(story, { max: 5 }) })
})

const admin = createAdmin(defineRegistry([storyList], { collections: [story] }))

const send = (method: string, path: string, body?: unknown) => sendTo(admin, method, path, body)

const ENTRY_PATH = '/collections/story/entries'

const content = (title: string) => ({ title: { en: title, es: `${title} ES` } })

const createStory = async (title: string) => {
  const { entry } = (await (
    await send('POST', ENTRY_PATH, { content: content(title) })
  ).json()) as { entry: { id: string } }
  await send('POST', `${ENTRY_PATH}/${entry.id}/publish`, { expectedVersion: 1 })
  return entry.id
}

const publishedPageListing = async (storyId: string) => {
  const { page } = (await (await send('POST', '/pages', regular('stories'))).json()) as {
    page: { id: string; version: number }
  }
  const saved = (await (
    await send('PUT', `/pages/${page.id}/blocks`, {
      blocks: [
        {
          id: 'list',
          block: 'story-list',
          schemaVersion: 1,
          content: { stories: { mode: 'chosen', ids: [storyId] } }
        }
      ],
      expectedVersion: page.version
    })
  ).json()) as { version: number }
  await send('POST', `/pages/${page.id}/publish`, { expectedVersion: saved.version })
  return page.id
}

const addressIn = async (pageId: string, locale: 'en' | 'es', storyId: string) => {
  const snapshot = snapshotSchema.parse(JSON.parse((await kv.get(snapshotKey(pageId, locale)))!))
  const { slug, href } = snapshot.entries.story![storyId]!
  return { slug, href }
}

describe('the address of an entry in a page snapshot', () => {
  useFreshPagesDb()

  it('carries the slug and path of the snapshot locale when the page is published', async () => {
    const storyId = await createStory('Big launch')
    const pageId = await publishedPageListing(storyId)
    expect(await addressIn(pageId, 'en', storyId)).toEqual({
      slug: 'big-launch',
      href: '/stories/big-launch'
    })
    expect(await addressIn(pageId, 'es', storyId)).toEqual({
      slug: 'big-launch-es',
      href: '/es/stories/big-launch-es'
    })
  })

  it('keeps the published slug until a renamed slug is published, then follows it', async () => {
    const storyId = await createStory('Big launch')
    const renamed = await send('PUT', `${ENTRY_PATH}/${storyId}`, {
      content: content('Big launch'),
      expectedVersion: 1,
      slugs: { en: 'the-launch' }
    })
    expect(renamed.status).toBe(200)
    const pageId = await publishedPageListing(storyId)
    expect(await addressIn(pageId, 'en', storyId)).toEqual({
      slug: 'big-launch',
      href: '/stories/big-launch'
    })
    const published = await send('POST', `${ENTRY_PATH}/${storyId}/publish`, {
      expectedVersion: 2
    })
    expect(published.status).toBe(200)
    expect(await addressIn(pageId, 'en', storyId)).toEqual({
      slug: 'the-launch',
      href: '/stories/the-launch'
    })
    expect(await addressIn(pageId, 'es', storyId)).toEqual({
      slug: 'big-launch-es',
      href: '/es/stories/big-launch-es'
    })
  })
})
