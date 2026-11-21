import { Hono } from 'hono'

import type { AdminRegistry } from '../collections.ts'
import { REORDER, reorderEntries } from '../db/entries.ts'
import { reorderEntriesSchema } from '../entries.ts'
import { API_ERROR } from '../errors.ts'

import type { AccessEnv } from './auth.ts'
import { collectionOf } from './collections.ts'
import { republishDependents } from './entry-dependents.ts'
import { refreshEntryIndex } from './entry-pages.ts'
import { readJsonBody, respondWithError } from './respond.ts'

export const entryOrderRoutes = (registry: AdminRegistry) =>
  new Hono<AccessEnv>().put('/:name/order', async (c) => {
    const found = collectionOf(registry, c)
    if (!found.ok) return found.response
    const body = await readJsonBody(c, reorderEntriesSchema)
    if (!body.ok) return body.response
    const outcome = await reorderEntries(c.env.DB, found.collection, body.data.ids)
    if (outcome === REORDER.unknownEntry) return respondWithError(c, API_ERROR.invalid)
    await refreshEntryIndex(c, found.collection)
    const republish = await republishDependents(c, registry, {
      entry: { collection: found.collection.name }
    })
    return c.json({ republish })
  })
