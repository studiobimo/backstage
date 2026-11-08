import { z } from 'zod'

import { image, localized } from './fields.ts'

export const SETTINGS = {
  siteName: { maxLength: 80 }
} as const

export const siteSettingsSchema = z.object({
  siteName: localized(z.string().trim().min(1).max(SETTINGS.siteName.maxLength)),
  defaultSocialImage: image().optional()
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const siteSettingsResponseSchema = z.object({ settings: siteSettingsSchema })

export const EMPTY_SITE_SETTINGS: SiteSettings = { siteName: {} }

export const siteSettingsJsonSchema = () => z.toJSONSchema(siteSettingsSchema, { io: 'input' })
