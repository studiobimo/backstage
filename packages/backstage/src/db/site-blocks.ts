import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { SiteBlock } from '../slots.ts'
import { siteBlocks } from './schema.ts'

export const readSiteBlocks = async (d1: AnyD1Database): Promise<Map<string, SiteBlock>> => {
  const rows = await drizzle(d1).select().from(siteBlocks)
  return new Map(
    rows.map(({ slot, block, schemaVersion, content }) => [
      slot,
      { block, schemaVersion, content: content as SiteBlock['content'] }
    ])
  )
}

export const writeSiteBlock = async (d1: AnyD1Database, slot: string, value: SiteBlock) => {
  const values = { slot, ...value, updatedAt: Date.now() }
  await drizzle(d1)
    .insert(siteBlocks)
    .values(values)
    .onConflictDoUpdate({ target: siteBlocks.slot, set: values })
}
