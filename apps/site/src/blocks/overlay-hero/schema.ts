import { image, link, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

export const overlayHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  cta: link().optional(),
  background: image(),
  tint: z.enum(['none', 'light', 'dark']).default('dark'),
  align: z.enum(['start', 'center']).default('start')
})
