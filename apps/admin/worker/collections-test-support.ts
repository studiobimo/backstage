import { createAdmin } from '@studiobimo/backstage/admin'
import {
  defineBlock,
  defineCollection,
  defineRegistry,
  image,
  localized
} from '@studiobimo/backstage'
import { expect } from 'vitest'
import { z } from 'zod'

import { db, sendTo, useFreshPagesDb } from './pages-test-support'

const blog = defineCollection({
  name: 'blog',
  label: 'title',
  quickToggle: ['featured'],
  title: { en: 'Blog', es: 'Blog' },
  schema: z.object({
    title: localized(z.string().min(1)),
    summary: localized(z.string()).optional(),
    cover: image().optional(),
    featured: z.boolean().default(false)
  })
})

const people = defineCollection({
  name: 'people',
  label: 'name',
  version: 2,
  schema: z.object({ name: z.string(), role: z.string().default('') }),
  migrate: (content) => ({ ...(content as object), role: 'migrated' })
})

const note = defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })

const admin = createAdmin(defineRegistry([note], { collections: [blog, people] }))

export interface EntryBody {
  entry: {
    id: string
    collection: string
    version: number
    schemaVersion: number
    label: Record<string, string>
    content: Record<string, unknown>
    publishedAt: number | null
    publishedVersion: number | null
    publishedBy: string | null
    updatedBy: string | null
  }
}

export const sendCollections = (method: string, path: string, body?: unknown) =>
  sendTo(admin, method, `/collections${path}`, body)

export const post = (title: string) => ({
  content: { title: { en: title, es: `${title} ES` } }
})

export const createPost = async (title = 'Hello') =>
  ((await (await sendCollections('POST', '/blog/entries', post(title))).json()) as EntryBody).entry

export const publishEntry = (id: string, expectedVersion: number) =>
  sendCollections('POST', `/blog/entries/${id}/publish`, { expectedVersion })

export const publishProblems = async (content: unknown) => {
  const created = await sendCollections('POST', '/blog/entries', { content })
  const response = await publishEntry(((await created.json()) as EntryBody).entry.id, 1)
  expect(response.status).toBe(422)
  return ((await response.json()) as { problems: { reason: string; path?: string }[] }).problems
}

export const issuePaths = async (response: Response) => {
  expect(response.status).toBe(400)
  const { issues } = (await response.json()) as { issues: { path: unknown[] }[] }
  return issues.map(({ path }) => path.join('.')).sort()
}

export const publishedContentOf = async (id: string) => {
  const row = await db
    .prepare('SELECT published_content FROM entries WHERE id = ?')
    .bind(id)
    .first<{ published_content: string | null }>()
  return row?.published_content ? JSON.parse(row.published_content) : null
}

export const resetDatabaseBeforeEach = useFreshPagesDb
