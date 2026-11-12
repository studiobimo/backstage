import { image, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import { ctaLink } from '../schema-parts.ts'

export const splitHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()).optional(),
  cta: ctaLink(),
  picture: image(),
  theme: z.enum(['light', 'dark']).default('light'),
  imageSide: z.enum(['start', 'end']).default('end')
})
