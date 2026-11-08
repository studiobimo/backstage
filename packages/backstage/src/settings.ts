import { z } from 'zod'

import { image, link, localized } from './fields.ts'

export const SETTINGS = {
  siteName: { maxLength: 80 },
  phone: { maxLength: 40 },
  address: { maxLength: 300 },
  footerText: { maxLength: 300 },
  navigation: { maxItems: 12 },
  footerLinks: { maxItems: 12 }
} as const

const navigationLink = () => localized(link({ strict: true }))

export const siteSettingsSchema = z.object({
  siteName: localized(z.string().trim().min(1).max(SETTINGS.siteName.maxLength)),
  defaultSocialImage: image().optional(),
  navigation: z.array(navigationLink()).max(SETTINGS.navigation.maxItems),
  footer: z.object({
    text: localized(z.string().trim().max(SETTINGS.footerText.maxLength)),
    links: z.array(navigationLink()).max(SETTINGS.footerLinks.maxItems)
  }),
  contact: z.object({
    email: z.email().optional(),
    phone: z.string().trim().max(SETTINGS.phone.maxLength).optional(),
    address: localized(z.string().trim().max(SETTINGS.address.maxLength))
  })
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const siteSettingsResponseSchema = z.object({ settings: siteSettingsSchema })

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  siteName: {},
  navigation: [],
  footer: { text: {}, links: [] },
  contact: { address: {} }
}

export const siteSettingsJsonSchema = () => z.toJSONSchema(siteSettingsSchema, { io: 'input' })
