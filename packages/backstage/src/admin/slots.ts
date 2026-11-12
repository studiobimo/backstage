import {
  API_ERROR,
  describeSlots,
  readSiteBlocks,
  siteBlockSchema,
  upgradeBlockContent,
  validateBlockContent,
  writeSiteBlock,
  type Registry,
  type SiteBlock
} from '../index.ts'
import { Hono } from 'hono'

import { readJsonBody, respondInvalid, respondWithError } from './respond.ts'
import type { AdminEnv } from './env.ts'

const currentOf = (registry: Registry, stored: SiteBlock | undefined): SiteBlock | null => {
  const block = stored && registry.get(stored.block)
  if (!stored || !block) return null
  const upgraded = upgradeBlockContent(block, stored.schemaVersion, stored.content)
  return upgraded.ok
    ? {
        block: block.name,
        schemaVersion: upgraded.schemaVersion,
        content: upgraded.content as SiteBlock['content']
      }
    : null
}

const describeAll = async (registry: Registry, db: D1Database) => {
  const stored = await readSiteBlocks(db)
  return describeSlots(registry).map((slot) => ({
    ...slot,
    current: currentOf(registry, stored.get(slot.name))
  }))
}

export const slotsRoutes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>()
    .get('/', async (c) => c.json({ slots: await describeAll(registry, c.env.DB) }))
    .put('/:slot', async (c) => {
      const slot = c.req.param('slot')
      const allowed = registry.slots.get(slot)
      if (!allowed) return respondWithError(c, API_ERROR.notFound)
      const body = await readJsonBody(c, siteBlockSchema)
      if (!body.ok) return body.response
      const block = registry.get(body.data.block)
      if (!block || !allowed.includes(block.name)) return respondWithError(c, API_ERROR.invalid)
      const valid = validateBlockContent(block, body.data.schemaVersion, body.data.content)
      if (!valid.ok) return respondInvalid(c, valid.issues)
      await writeSiteBlock(c.env.DB, slot, {
        block: block.name,
        schemaVersion: valid.schemaVersion,
        content: valid.content as SiteBlock['content']
      })
      const saved = (await describeAll(registry, c.env.DB)).find(({ name }) => name === slot)
      return c.json({ slot: saved })
    })
