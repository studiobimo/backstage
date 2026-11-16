import { Hono, type Context } from 'hono'

import { validateBlockContent } from '../blocks.ts'
import {
  collectionsOf,
  describeCollections,
  entryLabelsOf,
  type AdminRegistry,
  type Collection
} from '../collections.ts'
import {
  createEntry,
  deleteEntry,
  ENTRY_WRITE,
  findEntry,
  listEntries,
  readEntryStamp,
  updateEntry
} from '../db/entries.ts'
import { ensureUser } from '../db/users.ts'
import { createEntrySchema, saveEntrySchema } from '../entries.ts'
import { API_ERROR } from '../errors.ts'
import { resolveLocaleConfig } from '../locales.ts'

import type { AccessEnv } from './auth.ts'
import {
  readJsonBody,
  respondInvalid,
  RESPONSE_STATUS,
  respondWithError,
  respondWithStale,
  versionedWrite
} from './respond.ts'

export const collectionOf = (registry: AdminRegistry, c: Context) => {
  const collection = collectionsOf(registry).get(c.req.param('name') ?? '')
  return collection
    ? ({ ok: true, collection } as const)
    : ({ ok: false, response: respondWithError(c, API_ERROR.notFound) } as const)
}

export const respondEntryStale = async (c: Context<AccessEnv>, id: string) =>
  respondWithStale(c, await readEntryStamp(c.env.DB, id))

const entryResponse = async (c: Context<AccessEnv>, collection: Collection, id: string) => {
  const entry = await findEntry(c.env.DB, collection, id)
  return entry ? c.json({ entry }) : respondWithError(c, API_ERROR.notFound)
}

const contentOf = (registry: AdminRegistry, collection: Collection, content: unknown) => {
  const result = validateBlockContent(collection, collection.version, content)
  if (!result.ok) return result
  const { defaultLocale } = resolveLocaleConfig(registry)
  return {
    ok: true,
    content: result.content,
    labels: entryLabelsOf(collection, result.content, defaultLocale)
  } as const
}

export const collectionsRoutes = (registry: AdminRegistry) =>
  new Hono<AccessEnv>()
    .get('/', (c) => c.json({ collections: describeCollections(registry) }))
    .get('/:name/entries', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      return c.json({ entries: await listEntries(c.env.DB, found.collection) })
    })
    .post('/:name/entries', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      const body = await readJsonBody(c, createEntrySchema)
      if (!body.ok) return body.response
      const valid = contentOf(registry, found.collection, body.data.content)
      if (!valid.ok) return respondInvalid(c, valid.issues)
      const id = crypto.randomUUID()
      const editorId = await ensureUser(c.env.DB, c.get('editor'))
      await createEntry(c.env.DB, found.collection, id, valid, editorId)
      const entry = await findEntry(c.env.DB, found.collection, id)
      return c.json({ entry }, RESPONSE_STATUS.created)
    })
    .get('/:name/entries/:id', async (c) => {
      const found = collectionOf(registry, c)
      return found.ok ? entryResponse(c, found.collection, c.req.param('id')) : found.response
    })
    .put('/:name/entries/:id', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      const body = await readJsonBody(c, saveEntrySchema)
      if (!body.ok) return body.response
      const valid = contentOf(registry, found.collection, body.data.content)
      if (!valid.ok) return respondInvalid(c, valid.issues)
      const id = c.req.param('id')
      const write = await versionedWrite(c, body.data.expectedVersion)
      const outcome = await updateEntry(c.env.DB, found.collection, id, valid, write)
      if (outcome === ENTRY_WRITE.stale) return respondEntryStale(c, id)
      if (outcome === ENTRY_WRITE.notFound) return respondWithError(c, API_ERROR.notFound)
      return entryResponse(c, found.collection, id)
    })
    .delete('/:name/entries/:id', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      const outcome = await deleteEntry(c.env.DB, found.collection, c.req.param('id'))
      return outcome === ENTRY_WRITE.ok
        ? c.body(null, RESPONSE_STATUS.noContent)
        : respondWithError(c, API_ERROR.notFound)
    })
