import { and, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { SiteBlock, StoredSiteBlock } from '../slots.ts'
import { siteBlocks } from './schema.ts'
import {
  readStamp,
  writeVersionedRow,
  type RowWrite,
  type VersionedWrite
} from './versioned-row.ts'

export const readSiteBlocks = async (d1: AnyD1Database): Promise<Map<string, StoredSiteBlock>> => {
  const rows = await drizzle(d1).select().from(siteBlocks)
  return new Map(
    rows.map(({ slot, block, schemaVersion, content, version }) => [
      slot,
      { block, schemaVersion, content: content as SiteBlock['content'], version }
    ])
  )
}

export const readSiteBlockStamp = (d1: AnyD1Database, slot: string) =>
  readStamp(d1, siteBlocks, eq(siteBlocks.slot, slot))

export const writeSiteBlock = (
  d1: AnyD1Database,
  slot: string,
  value: SiteBlock,
  { expectedVersion, editorId }: VersionedWrite
): Promise<RowWrite> => {
  const db = drizzle(d1)
  const values = { ...value, updatedAt: Date.now(), updatedBy: editorId }
  const claimed = { slot: siteBlocks.slot }
  return writeVersionedRow(expectedVersion, {
    create: () =>
      db
        .insert(siteBlocks)
        .values({ slot, ...values })
        .onConflictDoNothing()
        .returning(claimed),
    update: () =>
      db
        .update(siteBlocks)
        .set({ ...values, version: expectedVersion + 1 })
        .where(and(eq(siteBlocks.slot, slot), eq(siteBlocks.version, expectedVersion)))
        .returning(claimed)
  })
}
