import { z } from 'zod'

import { image, link, localized, richText } from '../fields.ts'

const menuLink = () => localized(link({ strict: true }))

export const heroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  cta: link(),
  picture: image(),
  theme: z.enum(['light', 'dark']).default('light')
})

export const siteHeaderSchema = z.object({
  navigation: z.array(z.object({ link: menuLink(), dropdown: z.array(menuLink()).max(8) })).max(8),
  cta: menuLink().optional()
})

export const siteFooterSchema = z.object({
  logo: image().optional(),
  text: localized(z.string().trim().max(300)),
  columns: z
    .array(
      z.object({ heading: localized(z.string().trim().min(1)), links: z.array(menuLink()).max(8) })
    )
    .max(4),
  contact: z.object({
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
    address: localized(z.string().trim().max(300))
  })
})
