import { eq, type SQL } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { PageStamp } from '../pages.ts'
import { entries, pages, siteBlocks, siteSettings, users } from './schema.ts'

export interface VersionedWrite {
  expectedVersion: number
  editorId: string
}

export const ROW_VERSION = { absent: 0 } as const

export const ROW_WRITE = { ok: 'ok', stale: 'stale' } as const

export type RowWrite = (typeof ROW_WRITE)[keyof typeof ROW_WRITE]

interface RowWrites {
  create: () => PromiseLike<unknown[]>
  update: () => PromiseLike<unknown[]>
}

export const writeVersionedRow = async (
  expectedVersion: number,
  { create, update }: RowWrites
): Promise<RowWrite> => {
  const changed = await (expectedVersion === ROW_VERSION.absent ? create() : update())
  return changed.length > 0 ? ROW_WRITE.ok : ROW_WRITE.stale
}

type StampedTable = typeof pages | typeof siteSettings | typeof siteBlocks | typeof entries

export const readStamp = async (
  d1: AnyD1Database,
  table: StampedTable,
  where: SQL
): Promise<PageStamp | null> => {
  const [row] = await drizzle(d1)
    .select({
      version: table.version,
      updatedAt: table.updatedAt,
      name: users.name,
      email: users.email
    })
    .from(table as typeof pages)
    .leftJoin(users, eq(users.id, table.updatedBy))
    .where(where)
  if (!row) return null
  return {
    version: row.version,
    updatedAt: row.updatedAt,
    updatedBy: row.name || row.email || null
  }
}
