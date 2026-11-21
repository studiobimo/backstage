import type { Context } from 'hono'
import { Hono } from 'hono'

import { collectionSnapshotWrites } from '../collection-snapshot.ts'
import { quickToggleOf, type AdminRegistry, type Collection } from '../collections.ts'
import { ENTRY_WRITE, findEntry, findPublishedContent, recordEntryToggled } from '../db/entries.ts'
import { ensureUser } from '../db/users.ts'
import { toggleEntrySchema, type Entry } from '../entries.ts'
import { API_ERROR } from '../errors.ts'
import { resolveLocaleConfig } from '../locales.ts'
import { kvWritesPerPage, REPUBLISH } from '../republish.ts'
import { validateBlockContent } from '../blocks.ts'

import type { AccessEnv } from './auth.ts'
import { collectionOf, respondEntryStale } from './collections.ts'
import { republishDependentsOf } from './entry-dependents.ts'
import { planPublishedEntryPages, refreshEntryIndex, writeEntrySnapshots } from './entry-pages.ts'
import { checkEntry } from './entry-publish.ts'
import { readJsonBody, respondInvalid, respondUnpublishable, respondWithError } from './respond.ts'

interface FieldChange {
  field: string
  value: boolean
}

const withField = (content: unknown, { field, value }: FieldChange) =>
  ({ ...(content as Record<string, unknown>), [field]: value }) as Entry['content']

const ownWrites = (registry: AdminRegistry, collection: Collection) =>
  collectionSnapshotWrites(collection) +
  (collection.route
    ? kvWritesPerPage(resolveLocaleConfig(registry).locales) + REPUBLISH.writes.perIndexRebuild
    : 0)

const publishedVersionAfter = (entry: Entry, publishedVersion: number | null) =>
  publishedVersion === null || publishedVersion === entry.version
    ? entry.version + 1
    : publishedVersion

const publishChange = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entry: Entry,
  change: FieldChange
) => {
  const published = await findPublishedContent(c.env.DB, collection, entry.id)
  if (!published) return { ok: true, publication: null } as const
  const content = withField(published.content, change)
  const checked = await checkEntry(c, registry, collection, {
    ...entry,
    content,
    schemaVersion: published.schemaVersion
  })
  if (checked.problems.length > 0) {
    return { ok: false, response: respondUnpublishable(c, checked.problems) } as const
  }
  const publishedAt = Date.now()
  const pages = await planPublishedEntryPages(
    c,
    registry,
    collection,
    { ...entry, version: publishedVersionAfter(entry, published.version) },
    { content: checked.content, media: checked.media },
    publishedAt
  )
  if (pages.problems.length > 0) {
    return { ok: false, response: respondUnpublishable(c, pages.problems) } as const
  }
  await writeEntrySnapshots(c, registry, collection, entry.id, pages)
  return {
    ok: true,
    publication: { publishedAt, publishedContent: checked.content }
  } as const
}

export const entryToggleRoutes = (registry: AdminRegistry) =>
  new Hono<AccessEnv>().put('/:name/entries/:id/toggle', async (c) => {
    const found = collectionOf(registry, c)
    if (!found.ok) return found.response
    const body = await readJsonBody(c, toggleEntrySchema)
    if (!body.ok) return body.response
    const { collection } = found
    const { expectedVersion, ...change } = body.data
    if (!quickToggleOf(collection).includes(change.field)) {
      return respondWithError(c, API_ERROR.invalid)
    }
    const id = c.req.param('id')
    const entry = await findEntry(c.env.DB, collection, id)
    if (!entry) return respondWithError(c, API_ERROR.notFound)
    if (entry.version !== expectedVersion) return respondEntryStale(c, id)
    const draft = validateBlockContent(
      collection,
      collection.version,
      withField(entry.content, change)
    )
    if (!draft.ok) return respondInvalid(c, draft.issues)
    const changed =
      entry.publishedAt === null
        ? ({ ok: true, publication: null } as const)
        : await publishChange(c, registry, collection, entry, change)
    if (!changed.ok) return changed.response
    const outcome = await recordEntryToggled(c.env.DB, collection, id, {
      expectedVersion,
      editorId: await ensureUser(c.env.DB, c.get('editor')),
      content: draft.content,
      publication: changed.publication
    })
    if (outcome === ENTRY_WRITE.stale) return respondEntryStale(c, id)
    const published = changed.publication !== null
    if (published) await refreshEntryIndex(c, collection)
    return c.json({
      entry: await findEntry(c.env.DB, collection, id),
      republish: await republishDependentsOf(c, registry, collection, id, published),
      writes: published ? ownWrites(registry, collection) : 0
    })
  })
