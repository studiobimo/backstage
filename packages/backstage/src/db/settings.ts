import { and, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'
import { z } from 'zod'

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

export const SETTINGS_ROW = { site: 'site', registry: 'registry' } as const

export const readVersionedSiteSettings = async (
  d1: AnyD1Database
): Promise<VersionedSiteSettings> => {
  const [row] = await drizzle(d1)
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SETTINGS_ROW.site))
  const parsed = siteSettingsSchema.safeParse(row?.content)
  return {
    settings: parsed.success ? parsed.data : EMPTY_SITE_SETTINGS,
    version: row?.version ?? ROW_VERSION.absent
  }
}

const readSettingsStamp = (d1: AnyD1Database, rowId: string) =>
  readStamp(d1, siteSettings, eq(siteSettings.id, rowId))

export const readSiteSettingsStamp = (d1: AnyD1Database) => readSettingsStamp(d1, SETTINGS_ROW.site)

export const readRegistrySettingsStamp = (d1: AnyD1Database) =>
  readSettingsStamp(d1, SETTINGS_ROW.registry)

export const readRegistrySettings = async (d1: AnyD1Database) => {
  const [row] = await drizzle(d1)
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SETTINGS_ROW.registry))
  const parsed = z.record(z.string(), z.unknown()).safeParse(row?.content)
  return {
    settings: parsed.success ? parsed.data : {},
    version: row?.version ?? ROW_VERSION.absent
  }
}

const writeSettingsRow = (
  d1: AnyD1Database,
  rowId: string,
  settings: unknown,
  { expectedVersion, editorId }: VersionedWrite
): Promise<RowWrite> => {
  const db = drizzle(d1)
  const values = { content: settings, updatedAt: Date.now(), updatedBy: editorId }
  const claimed = { id: siteSettings.id }
  return writeVersionedRow(expectedVersion, {
    create: () =>
      db
        .insert(siteSettings)
        .values({ id: rowId, ...values })
        .onConflictDoNothing()
        .returning(claimed),
    update: () =>
      db
        .update(siteSettings)
        .set({ ...values, version: expectedVersion + 1 })
        .where(and(eq(siteSettings.id, rowId), eq(siteSettings.version, expectedVersion)))
        .returning(claimed)
  })
}

export const writeSiteSettings = (
  d1: AnyD1Database,
  settings: SiteSettings,
  write: VersionedWrite
) => writeSettingsRow(d1, SETTINGS_ROW.site, settings, write)

export const writeRegistrySettings = (
  d1: AnyD1Database,
  settings: Record<string, unknown>,
  write: VersionedWrite
) => writeSettingsRow(d1, SETTINGS_ROW.registry, settings, write)
