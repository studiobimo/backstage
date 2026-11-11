import { image, localized } from '@studiobimo/backstage'
import { z } from 'zod'

import { menuLink } from '../schema-parts.ts'

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
