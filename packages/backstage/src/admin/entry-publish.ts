import { Hono } from 'hono'

import { schemaNodeOf, validateBlockContent } from '../blocks.ts'
import type { AdminRegistry, Collection } from '../collections.ts'
import {
  ENTRY_WRITE,
  findEntry,
  recordEntryPublished,
  recordEntryUnpublished
} from '../db/entries.ts'
import { readMedia } from '../db/publishing.ts'
import { ensureUser } from '../db/users.ts'
import { publishEntrySchema, type Entry } from '../entries.ts'
import { API_ERROR } from '../errors.ts'
import { resolveLocaleConfig } from '../locales.ts'
import {
  contentProblems,
  mediaIdsIn,
  failureProblems,
  type PublishMediaRow,
  type PublishProblem
} from '../publishing.ts'
import type { TranslatedNode } from '../translations.ts'

import type { AccessEnv } from './auth.ts'
import { collectionOf, respondEntryStale } from './collections.ts'
import { removeAndRepublish, republishDependentsOf } from './entry-dependents.ts'
import {
  planEntryPages,
  refreshEntryIndex,
  withoutEntryPages,
  writeEntryPages
} from './entry-pages.ts'
import { readJsonBody, respondUnpublishable, respondWithError } from './respond.ts'

export interface PublishCheck {
  problems: PublishProblem[]
  content?: unknown
  media: ReadonlyMap<string, PublishMediaRow>
}

export const checkEntry = async (
  c: { env: AccessEnv['Bindings'] },
  registry: AdminRegistry,
  collection: Collection,
  entry: Entry
): Promise<PublishCheck> => {
  const content = validateBlockContent(collection, entry.schemaVersion, entry.content)
  if (!content.ok) return { problems: failureProblems(content, {}), media: new Map() }
  const schema = schemaNodeOf(collection.schema) as TranslatedNode
  const media = await readMedia(c.env.DB, mediaIdsIn(schema, content.content))
  const { defaultLocale } = resolveLocaleConfig(registry)
  return {
    problems: contentProblems(schema, content.content, media, {}, defaultLocale),
    content: content.content,
    media
  }
}

export const entryPublishRoutes = (registry: AdminRegistry) =>
  new Hono<AccessEnv>()
    .post('/:name/entries/:id/publish', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      const body = await readJsonBody(c, publishEntrySchema)
      if (!body.ok) return body.response
      const { collection } = found
      const id = c.req.param('id')
      const entry = await findEntry(c.env.DB, collection, id)
      if (!entry) return respondWithError(c, API_ERROR.notFound)
      if (entry.version !== body.data.expectedVersion) return respondEntryStale(c, id)
      const { problems, content, media } = await checkEntry(c, registry, collection, entry)
      if (problems.length > 0) return respondUnpublishable(c, problems)
      const publishedAt = Date.now()
      const pages = await planEntryPages(
        c,
        registry,
        collection,
        entry,
        { content, media },
        publishedAt
      )
      if (pages.problems.length > 0) return respondUnpublishable(c, pages.problems)
      await writeEntryPages(c, registry, collection, id, pages)
      const outcome = await recordEntryPublished(c.env.DB, collection, id, {
        expectedVersion: entry.version,
        editorId: await ensureUser(c.env.DB, c.get('editor')),
        publishedAt,
        publishedContent: content,
        publishedSchemaVersion: entry.schemaVersion
      })
      if (outcome === ENTRY_WRITE.stale) return respondEntryStale(c, id)
      await refreshEntryIndex(c, collection)
      return c.json({
        entry: await findEntry(c.env.DB, collection, id),
        republish: await republishDependentsOf(c, registry, collection, id, true)
      })
    })
    .delete('/:name/entries/:id/publish', async (c) => {
      const found = collectionOf(registry, c)
      if (!found.ok) return found.response
      const id = c.req.param('id')
      const republish = await removeAndRepublish(
        c,
        registry,
        found.collection,
        (d1, collection, entryId) =>
          withoutEntryPages(c, registry, collection, entryId, () =>
            recordEntryUnpublished(d1, collection, entryId)
          )
      )
      if (!republish) return respondWithError(c, API_ERROR.notFound)
      return c.json({ entry: await findEntry(c.env.DB, found.collection, id), republish })
    })
