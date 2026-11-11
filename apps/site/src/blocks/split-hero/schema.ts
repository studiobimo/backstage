import { image, link, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

export const splitHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  cta: link(),
  picture: image(),
  theme: z.enum(['light', 'dark']).default('light'),
  imageSide: z.enum(['start', 'end']).default('end')
})
