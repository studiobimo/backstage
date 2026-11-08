import { eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { EMPTY_SITE_SETTINGS, siteSettingsSchema, type SiteSettings } from '../settings.ts'
import { siteSettings } from './schema.ts'

const SITE_ROW_ID = 'site'

export const readSiteSettings = async (d1: AnyD1Database): Promise<SiteSettings> => {
  const [row] = await drizzle(d1)
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_ROW_ID))
  const parsed = siteSettingsSchema.safeParse(row?.content)
  return parsed.success ? parsed.data : EMPTY_SITE_SETTINGS
}

export const writeSiteSettings = async (d1: AnyD1Database, settings: SiteSettings) => {
  const values = { id: SITE_ROW_ID, content: settings, updatedAt: Date.now() }
  await drizzle(d1)
    .insert(siteSettings)
    .values(values)
    .onConflictDoUpdate({ target: siteSettings.id, set: values })
}
