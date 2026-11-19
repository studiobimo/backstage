import { z } from 'zod'

import { hexColor, image, localized } from './fields.ts'
import { PAGE } from './pages.ts'

const SETTINGS = {
  siteName: { maxLength: 80 },
  defaultDescription: { maxLength: PAGE.seo.description.maxLength }
} as const

export const siteSettingsSchema = z.object({
  siteName: localized(z.string().trim().min(1).max(SETTINGS.siteName.maxLength)),
  defaultDescription: localized(
    z.string().trim().max(SETTINGS.defaultDescription.maxLength)
  ).optional(),
  defaultSocialImage: image().optional(),
  logo: image().optional(),
  themeColor: hexColor().optional()
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const expectedSiteVersion = z.number().int().min(0)

export const saveSiteSettingsSchema = siteSettingsSchema.extend({
  expectedVersion: expectedSiteVersion
})

export const siteSettingsResponseSchema = z.object({
  settings: siteSettingsSchema,
  version: z.number().int()
})
export type VersionedSiteSettings = z.infer<typeof siteSettingsResponseSchema>

export const EMPTY_SITE_SETTINGS: SiteSettings = { siteName: {} }

export const siteSettingsJsonSchema = () => z.toJSONSchema(siteSettingsSchema, { io: 'input' })

const settingsValues = z.record(z.string(), z.unknown())

export const registrySettingsResponseSchema = z.object({
  schema: z.record(z.string(), z.unknown()).nullable(),
  settings: settingsValues,
  version: z.number().int()
})
export type RegistrySettingsResponse = z.infer<typeof registrySettingsResponseSchema>

export const saveRegistrySettingsSchema = z.object({
  settings: settingsValues,
  expectedVersion: expectedSiteVersion
})
