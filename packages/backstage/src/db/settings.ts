import { and, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import {
  EMPTY_SITE_SETTINGS,
  siteSettingsSchema,
  type SiteSettings,
  type VersionedSiteSettings
} from '../settings.ts'
import { siteSettings } from './schema.ts'
import {
  readStamp,
  ROW_VERSION,
  writeVersionedRow,
  type RowWrite,
  type VersionedWrite
} from './versioned-row.ts'

const SITE_ROW_ID = 'site'

export const readVersionedSiteSettings = async (
  d1: AnyD1Database
): Promise<VersionedSiteSettings> => {
  const [row] = await drizzle(d1)
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_ROW_ID))
  const parsed = siteSettingsSchema.safeParse(row?.content)
  return {
    settings: parsed.success ? parsed.data : EMPTY_SITE_SETTINGS,
    version: row?.version ?? ROW_VERSION.absent
  }
}

export const readSiteSettingsStamp = (d1: AnyD1Database) =>
  readStamp(d1, siteSettings, eq(siteSettings.id, SITE_ROW_ID))

export const writeSiteSettings = (
  d1: AnyD1Database,
  settings: SiteSettings,
  { expectedVersion, editorId }: VersionedWrite
): Promise<RowWrite> => {
  const db = drizzle(d1)
  const values = { content: settings, updatedAt: Date.now(), updatedBy: editorId }
  const claimed = { id: siteSettings.id }
  return writeVersionedRow(expectedVersion, {
    create: () =>
      db
        .insert(siteSettings)
        .values({ id: SITE_ROW_ID, ...values })
        .onConflictDoNothing()
        .returning(claimed),
    update: () =>
      db
        .update(siteSettings)
        .set({ ...values, version: expectedVersion + 1 })
        .where(and(eq(siteSettings.id, SITE_ROW_ID), eq(siteSettings.version, expectedVersion)))
        .returning(claimed)
  })
}
