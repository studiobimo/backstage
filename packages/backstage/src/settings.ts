import { z } from 'zod'

import { image, localized } from './fields.ts'
import { PAGE } from './pages.ts'

export const SETTINGS = {
  siteName: { maxLength: 80 },
  defaultDescription: { maxLength: PAGE.seo.description.maxLength }
} as const

export const siteSettingsSchema = z.object({
  siteName: localized(z.string().trim().min(1).max(SETTINGS.siteName.maxLength)),
  defaultDescription: localized(
    z.string().trim().max(SETTINGS.defaultDescription.maxLength)
  ).optional(),
  defaultSocialImage: image().optional()
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const expectedSiteVersion = z.number().int().min(0)

export const saveSiteSettingsSchema = siteSettingsSchema.extend({
  expectedVersion: expectedSiteVersion
})

export const siteSettingsResponseSchema = z.object({ settings: siteSettingsSchema })

export interface VersionedSiteSettings {
  settings: SiteSettings
  version: number
}

export const EMPTY_SITE_SETTINGS: SiteSettings = { siteName: {} }

export const siteSettingsJsonSchema = () => z.toJSONSchema(siteSettingsSchema, { io: 'input' })
