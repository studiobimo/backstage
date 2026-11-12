import { image, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import { ctaLink } from '../schema-parts.ts'

export const overlayHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()).optional(),
  cta: ctaLink().optional(),
  background: image(),
  tint: z.enum(['none', 'light', 'dark']).default('dark'),
  align: z.enum(['start', 'center']).default('start')
})
