import type { AnyD1Database } from 'drizzle-orm/d1'
import type { Context } from 'hono'

import { ENTRY_WRITE, findEntry, type EntryWrite } from '../db/entries.ts'
import { countRepublishable } from '../db/publishing.ts'
import { resolveLocaleConfig } from '../locales.ts'
import {
  kvWritesToRefresh,
  republishBatchSize,
  type EntryDependents,
  type RepublishEntry,
  type RepublishScope
} from '../republish.ts'
import type { AdminRegistry, Collection } from '../collections.ts'

import type { AccessEnv } from './auth.ts'
import { runRepublishBatch } from './republish.ts'

const NO_DEPENDENTS: EntryDependents = { pages: 0, writes: 0, pending: false, batch: null }

const republishDependents = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  entry: RepublishEntry
): Promise<EntryDependents> => {
  const { locales } = resolveLocaleConfig(registry)
  const scope: RepublishScope = { since: null, cursor: null, entry }
  const { remaining } = await countRepublishable(c.env.DB, scope)
  const writes = kvWritesToRefresh(remaining, locales)
  if (remaining === 0) return NO_DEPENDENTS
  if (remaining > republishBatchSize(locales)) {
    return { pages: remaining, writes, pending: true, batch: null }
  }
  const batch = await runRepublishBatch(c, registry, scope)
  return { pages: remaining, writes, pending: !batch.done, batch }
}

export const republishDependentsOf = (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entryId: string,
  wasPublished: boolean
) =>
  wasPublished
    ? republishDependents(c, registry, { collection: collection.name, entryId })
    : Promise.resolve(NO_DEPENDENTS)

export const removeAndRepublish = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  remove: (d1: AnyD1Database, collection: Collection, id: string) => Promise<EntryWrite>
) => {
  const entryId = c.req.param('id') ?? ''
  const wasPublished = (await findEntry(c.env.DB, collection, entryId))?.publishedAt != null
  const outcome = await remove(c.env.DB, collection, entryId)
  if (outcome !== ENTRY_WRITE.ok) return null
  return republishDependentsOf(c, registry, collection, entryId, wasPublished)
}
