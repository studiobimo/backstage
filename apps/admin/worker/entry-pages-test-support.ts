import { createAdmin } from '@studiobimo/backstage/admin'
import { defineBlock, defineCollection, defineRegistry, localized } from '@studiobimo/backstage'
import { entrySnapshotKey, entrySnapshotSchema, SEO } from '@studiobimo/backstage/site'
import { z } from 'zod'

import { kv, sendTo, useFreshPagesDb } from './pages-test-support'

const news = defineCollection({
  name: 'news',
  label: 'title',
  route: { path: '/news/:slug' },
  schema: z.object({ title: localized(z.string().min(1)), body: localized(z.string()).optional() })
})

const faq = defineCollection({
  name: 'faq',
  label: 'question',
  schema: z.object({ question: z.string() })
})

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

const admin = createAdmin(defineRegistry([note], { collections: [news, faq] }))

export interface RoutedEntryBody {
  entry: {
    id: string
    version: number
    slugs: Record<string, string | null>
    publishedAt: number | null
  }
}

export const sendNews = (method: string, path: string, body?: unknown) =>
  sendTo(admin, method, `/collections/news${path}`, body)

export const sendFaq = (method: string, path: string, body?: unknown) =>
  sendTo(admin, method, `/collections/faq${path}`, body)

export const newsContent = (title: string, spanish = `${title} ES`) => ({
  title: { en: title, es: spanish }
})

export const createNews = async (title = 'Big launch', extra: object = {}) => {
  const response = await sendNews('POST', '/entries', { content: newsContent(title), ...extra })
  return { status: response.status, ...((await response.json()) as RoutedEntryBody) }
}

export const publishNews = (id: string, expectedVersion = 1) =>
  sendNews('POST', `/entries/${id}/publish`, { expectedVersion })

export const newsSnapshot = async (id: string, locale: 'en' | 'es') =>
  entrySnapshotSchema.parse(JSON.parse((await kv.get(entrySnapshotKey('news', id, locale)))!))

export const entryKeys = async () =>
  (await kv.list()).keys.map(({ name }) => name).filter((name) => name !== SEO.indexKey)

export const resetDatabaseBeforeEach = useFreshPagesDb
