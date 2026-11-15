import { API_ERROR } from '../errors.ts'
import { describeSlots, openStoredContent, validateBlockContent, type Registry } from '../blocks.ts'
import { readSiteBlocks, readSiteBlockStamp, writeSiteBlock } from '../db/site-blocks.ts'
import { ROW_VERSION, ROW_WRITE } from '../db/versioned-row.ts'
import { saveSiteBlockSchema, type SiteBlock, type StoredSiteBlock } from '../slots.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import {
  readJsonBody,
  respondInvalid,
  respondWithError,
  respondWithStale,
  versionedWrite
} from './respond.ts'

const currentOf = (registry: Registry, stored: StoredSiteBlock | undefined): SiteBlock | null => {
  const block = stored && registry.get(stored.block)
  if (!stored || !block) return null
  const opened = openStoredContent(block, stored.schemaVersion, stored.content)
  return {
    block: block.name,
    schemaVersion: opened.schemaVersion,
    content: opened.content as SiteBlock['content']
  }
}

const describeAll = async (registry: Registry, db: D1Database) => {
  const stored = await readSiteBlocks(db)
  return describeSlots(registry).map((slot) => ({
    ...slot,
    version: stored.get(slot.name)?.version ?? ROW_VERSION.absent,
    current: currentOf(registry, stored.get(slot.name))
  }))
}

export const slotsRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ slots: await describeAll(registry, c.env.DB) }))
    .put('/:slot', async (c) => {
      const slot = c.req.param('slot')
      const allowed = registry.slots.get(slot)
      if (!allowed) return respondWithError(c, API_ERROR.notFound)
      const body = await readJsonBody(c, saveSiteBlockSchema)
      if (!body.ok) return body.response
      const { expectedVersion, ...input } = body.data
      const block = registry.get(input.block)
      if (!block || !allowed.includes(block.name)) return respondWithError(c, API_ERROR.invalid)
      const valid = validateBlockContent(block, input.schemaVersion, input.content)
      if (!valid.ok) return respondInvalid(c, valid.issues)
      const outcome = await writeSiteBlock(
        c.env.DB,
        slot,
        {
          block: block.name,
          schemaVersion: valid.schemaVersion,
          content: valid.content as SiteBlock['content']
        },
        await versionedWrite(c, expectedVersion)
      )
      if (outcome === ROW_WRITE.stale) {
        return respondWithStale(c, await readSiteBlockStamp(c.env.DB, slot))
      }
      const saved = (await describeAll(registry, c.env.DB)).find(({ name }) => name === slot)
      return c.json({ slot: saved })
    })
