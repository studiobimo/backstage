import { z } from 'zod'

import { menuLink } from '../schema-parts.ts'

export const siteHeaderSchema = z.object({
  navigation: z.array(z.object({ link: menuLink(), dropdown: z.array(menuLink()).max(8) })).max(8),
  cta: menuLink().optional()
})
